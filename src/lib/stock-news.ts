/**
 * 주식 뉴스 수집 공유 라이브러리
 * - fetchNaverResearch: 한국 주식 증권사 리서치 리포트
 * - fetchNaverNews: 해외 주식 뉴스
 */

export interface StockNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string | null;
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

export async function fetchNaverResearch(stockCode: string): Promise<StockNewsItem[]> {
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
export function toNaverGlobalTicker(code: string): string[] {
  if (code.includes(".")) return [code];
  return [`${code}.O`, `${code}.N`];
}

export async function fetchNaverNews(
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
      summary: item.body?.slice(0, 300) ?? null,
    };
  });
}

/* ─── HTML 태그 제거 ─── */

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/* ─── 네이버 검색 API ─── */

export async function fetchNaverSearchNews(stockName: string): Promise<StockNewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(stockName)}&display=10&sort=date`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      },
    );
    if (!res.ok) return [];

    const data: {
      items: Array<{
        title: string;
        originallink: string;
        link: string;
        description: string;
        pubDate: string;
      }>;
    } = await res.json();

    return data.items
      .filter((item) => stripHtmlTags(item.title).includes(stockName))
      .slice(0, 10)
      .map((item) => ({
        title: stripHtmlTags(item.title),
        url: item.originallink || item.link,
        source: "네이버뉴스",
        publishedAt: new Date(item.pubDate).toISOString(),
        summary: stripHtmlTags(item.description).slice(0, 300) || null,
      }));
  } catch {
    return [];
  }
}

/* ─── 중복 제거 ─── */

function normalizeTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, "") // [속보], [단독] 등 대괄호 태그 제거
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, 40);
}

export function deduplicateNews(items: StockNewsItem[]): StockNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ─── 최신성 필터 ─── */

export function filterRecentNews(items: StockNewsItem[], daysBack = 7): StockNewsItem[] {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return items.filter((item) => {
    if (!item.publishedAt) return true; // publishedAt 없는 항목은 유지
    const d = new Date(item.publishedAt);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}

/* ─── 통합 fetch 함수 ─── */

export async function fetchAllNews(
  stockCode: string,
  stockName: string,
  options: { isKorean: boolean },
): Promise<StockNewsItem[]> {
  const fetchers = options.isKorean
    ? [fetchNaverSearchNews(stockName), fetchNaverResearch(stockCode)]
    : [fetchNaverSearchNews(stockName), fetchNaverNews(stockCode, stockName)];

  const results = await Promise.allSettled(fetchers);
  const allItems: StockNewsItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  return deduplicateNews(filterRecentNews(allItems));
}
