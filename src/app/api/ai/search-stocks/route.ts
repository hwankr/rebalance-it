import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuth, resolvePlanTier } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { SEARCH_STOCKS_SYSTEM_PROMPT } from "@/lib/ai/prompts/search-stocks";
import {
  checkAndIncrementUsage,
  addUsageHeaders,
  createLimitExceededResponse,
} from "@/lib/ai/usage-tracker";

const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 20;

interface StockItem {
  stock_code: string;
  stock_name: string;
  stock_name_ko: string | null;
  market: string;
  country: string;
  currency: string;
  asset_type?: "STOCK" | "ETF";
}

interface ParsedFilters {
  keywords: string[];
  keywords_ko: string[];
  keywords_en: string[];
  market: string | null;
  asset_type: string | null;
}

// Module-level cache: load stocks.json once per server lifetime
let stocksCache: StockItem[] | null = null;

async function getStocks(): Promise<StockItem[]> {
  if (stocksCache) return stocksCache;
  const filePath = path.join(process.cwd(), "public", "data", "stocks.json");
  const raw = await fs.readFile(filePath, "utf-8");
  stocksCache = JSON.parse(raw) as StockItem[];
  return stocksCache;
}

/** 프롬프트 인젝션 방지: 제어문자 제거 후 길이 제한 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** 마켓 필터 문자열을 DB market 컬럼과 매칭할 시장 목록으로 변환 */
function resolveMarkets(market: string | null): string[] | null {
  if (!market) return null;
  const m = market.toUpperCase();
  if (m === "US") return ["NYSE", "NASDAQ"];
  if (m === "KR") return ["KOSPI", "KOSDAQ"];
  if (m === "KOSPI") return ["KOSPI"];
  if (m === "KOSDAQ") return ["KOSDAQ"];
  if (m === "NYSE") return ["NYSE"];
  if (m === "NASDAQ") return ["NASDAQ"];
  return null;
}

/** 종목에 대한 키워드 매칭 점수 계산 */
function scoreStock(stock: StockItem, keywords: string[]): number {
  const fields = [
    stock.stock_code.toLowerCase(),
    stock.stock_name.toLowerCase(),
    (stock.stock_name_ko ?? "").toLowerCase(),
  ];

  let score = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (!kwLower) continue;
    for (const field of fields) {
      if (field === kwLower) {
        score += 3; // exact match
      } else if (field.startsWith(kwLower)) {
        score += 2; // prefix match
      } else if (field.includes(kwLower)) {
        score += 1; // substring match
      }
    }
  }
  return score;
}

export async function POST(request: NextRequest) {
  let authResult: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authResult = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "인증 오류" }, { status: 401 });
  }
  const { user, supabase } = authResult;

  // 플랜 조회 (grace period 포함)
  const plan = await resolvePlanTier(supabase, user.id);

  const usage = await checkAndIncrementUsage(user.id, 'ai_search', plan);
  if (!usage.allowed) {
    return createLimitExceededResponse('ai_search', usage.dailyLimit);
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "AI 기능을 사용할 수 없습니다. (API 키 미설정)" },
      { status: 503 },
    );
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json(
      { error: "query 필드는 필수입니다." },
      { status: 400 },
    );
  }

  const safeQuery = sanitizeQuery(body.query);
  if (!safeQuery) {
    return NextResponse.json(
      { error: "유효한 검색어를 입력해주세요." },
      { status: 400 },
    );
  }

  // 1. AI로 자연어 쿼리 파싱
  let filters: ParsedFilters;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SEARCH_STOCKS_SYSTEM_PROMPT },
          { role: "user", content: safeQuery },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0,
      },
      { timeout: 20000 },
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    filters = {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
      keywords_ko: Array.isArray(parsed.keywords_ko) ? parsed.keywords_ko.map(String) : [],
      keywords_en: Array.isArray(parsed.keywords_en) ? parsed.keywords_en.map(String) : [],
      market: typeof parsed.market === "string" ? parsed.market : null,
      asset_type: typeof parsed.asset_type === "string" ? parsed.asset_type : null,
    };
  } catch {
    return NextResponse.json(
      { error: "검색 쿼리 분석에 실패했습니다." },
      { status: 500 },
    );
  }

  // 2. 종목 리스트 로드
  let stocks: StockItem[];
  try {
    stocks = await getStocks();
  } catch {
    return NextResponse.json(
      { error: "종목 데이터를 불러올 수 없습니다." },
      { status: 500 },
    );
  }

  // 3. 마켓 필터 적용
  const allowedMarkets = resolveMarkets(filters.market);
  let candidates = allowedMarkets
    ? stocks.filter((s) => allowedMarkets.includes(s.market))
    : stocks;

  // 4. 자산유형 필터 적용
  if (filters.asset_type === "ETF" || filters.asset_type === "STOCK") {
    candidates = candidates.filter(
      (s) => (s.asset_type ?? "STOCK") === filters.asset_type,
    );
  }

  // 5. 키워드 점수 계산 후 정렬 → 상위 20개
  const allKeywords = [
    ...filters.keywords,
    ...filters.keywords_ko,
    ...filters.keywords_en,
  ];

  const scored = candidates
    .map((s) => ({ stock: s, score: scoreStock(s, allKeywords) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  const response = NextResponse.json({
    results: scored.map((x) => x.stock),
    filters,
  });
  addUsageHeaders(response.headers, usage.remaining, usage.dailyLimit);
  return response;
}
