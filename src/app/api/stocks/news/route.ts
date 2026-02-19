import { NextRequest, NextResponse } from "next/server";

export interface StockNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const market = searchParams.get("market") ?? undefined;
  const name = searchParams.get("name") ?? undefined;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const isKorean = market === "KOSPI" || market === "KOSDAQ" || /^\d{6}$/.test(code);
    const news = isKorean
      ? await fetchNaverResearch(code)
      : await fetchNaverNews(code, name);
    return NextResponse.json({
      items: news,
      fetchedAt: new Date().toISOString(),
      provider: "네이버 금융",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "뉴스 조회 실패" },
      { status: 500 },
    );
  }
}

/* ─── 네이버 증권사 리서치 리포트 (한국 주식) ─── */

interface NaverResearch {
  id: number;
  cd: string;
  nm: string;
  bnm: string;
  tit: string;
  wdt: string; // "20260210"
}

async function fetchNaverResearch(stockCode: string): Promise<StockNewsItem[]> {
  const res = await fetch(
    `https://m.stock.naver.com/api/stock/${stockCode}/integration`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) {
    throw new Error(`네이버 금융 API 오류: ${res.status}`);
  }

  const data = await res.json();
  const researches: NaverResearch[] = data.researches ?? [];

  return researches.slice(0, 5).map((item) => {
    const dt = item.wdt;
    const isoDate =
      dt.length >= 8
        ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T00:00:00+09:00`
        : "";

    return {
      title: item.tit,
      url: `https://finance.naver.com/research/company_read.naver?nid=${item.id}`,
      source: item.bnm,
      publishedAt: isoDate,
      summary: null,
    };
  });
}

/* ─── 네이버 뉴스 (해외 주식) ─── */

interface NaverNewsGroup {
  total: number;
  items: Array<{
    officeId: string;
    articleId: string;
    officeName: string;
    title: string;
    body?: string;
    datetime: string; // "202602180037"
  }>;
}

/** 해외 종목코드 → 네이버 티커 (NASDAQ: .O, NYSE: .N) */
function toNaverGlobalTicker(code: string): string[] {
  // 이미 suffix가 있으면 그대로
  if (code.includes(".")) return [code];
  // NASDAQ(.O)를 먼저 시도, NYSE(.N) 폴백
  return [`${code}.O`, `${code}.N`];
}

async function fetchNaverNews(
  stockCode: string,
  stockName?: string,
): Promise<StockNewsItem[]> {
  const tickers = toNaverGlobalTicker(stockCode);
  let allItems: NaverNewsGroup["items"] = [];

  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `https://m.stock.naver.com/api/news/stock/${ticker}?pageSize=20`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      if (!res.ok) continue;

      const groups: NaverNewsGroup[] = await res.json();
      allItems = groups.flatMap((g) => g.items ?? []);
      if (allItems.length > 0) break;
    } catch {
      continue;
    }
  }

  // 종목명으로 필터링 (관련 뉴스만)
  let filtered = allItems;
  if (stockName) {
    filtered = allItems.filter(
      (item) =>
        item.title.includes(stockName) ||
        (item.body ?? "").slice(0, 150).includes(stockName),
    );
  }

  // 필터 결과가 부족하면 전체에서 상위 반환
  const result = filtered.length >= 3 ? filtered : allItems;

  return result.slice(0, 5).map((item) => {
    const dt = item.datetime;
    const isoDate =
      dt.length >= 12
        ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(8, 10)}:${dt.slice(10, 12)}:00+09:00`
        : "";

    return {
      title: item.title.replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
      url: `https://n.news.naver.com/mnews/article/${item.officeId}/${item.articleId}`,
      source: item.officeName,
      publishedAt: isoDate,
      summary: null,
    };
  });
}
