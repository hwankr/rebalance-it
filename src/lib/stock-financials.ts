/**
 * 재무 데이터 조회
 * - 한국 주식: 네이버 금융 API (정확도 높음)
 * - 미국 주식: Yahoo Finance (yahoo-finance2)
 */

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface StockFinancials {
  stockCode: string;
  stockName: string;
  currency: string;
  currentPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  dividendYield: number | null;
  totalRevenue: number | null;
  revenueGrowth: number | null;
  operatingIncome: number | null;
  profitMargins: number | null;
  sector: string | null;
  industry: string | null;
  longBusinessSummary: string | null;
  /** ISO 8601 timestamp of when data was fetched */
  fetchedAt: string;
  /** Data provider name */
  provider: string;
}

/* ─── 네이버 금융 (한국 주식) ─── */

interface NaverTotalInfo {
  code: string;
  key: string;
  value: string;
}

/** "1,072조 6,384억", "37.62배", "4,816원", "0.92%" 등 파싱 */
function parseNaverValue(text: string): number | null {
  if (!text || text === "-" || text === "N/A") return null;
  const cleaned = text.replace(/,/g, "");

  // 조/억 포맷 (시가총액 등)
  if (cleaned.includes("조") || cleaned.includes("억")) {
    let total = 0;
    const joMatch = cleaned.match(/([\d.]+)조/);
    const eokMatch = cleaned.match(/([\d.]+)억/);
    if (joMatch) total += parseFloat(joMatch[1]) * 1_000_000_000_000;
    if (eokMatch) total += parseFloat(eokMatch[1]) * 100_000_000;
    return total || null;
  }

  // 단위 제거 (배, 원, %, 백만 등)
  const numStr = cleaned.replace(/[배원%백만]/g, "").trim();
  const num = parseFloat(numStr);
  return isNaN(num) ? null : num;
}

function getNaverInfo(infos: NaverTotalInfo[], code: string): string {
  return infos.find((i) => i.code === code)?.value ?? "";
}

async function fetchNaverFinancials(stockCode: string): Promise<StockFinancials> {
  const headers = { "User-Agent": "Mozilla/5.0" };

  const [integrationRes, annualRes] = await Promise.all([
    fetch(`https://m.stock.naver.com/api/stock/${stockCode}/integration`, { headers }),
    fetch(`https://m.stock.naver.com/api/stock/${stockCode}/finance/annual`, { headers }),
  ]);

  if (!integrationRes.ok) {
    throw new Error(`네이버 금융 API 오류: ${integrationRes.status}`);
  }

  const integration = await integrationRes.json();
  const infos: NaverTotalInfo[] = integration.totalInfos ?? [];
  const stockName: string = integration.stockName ?? stockCode;

  // 연간 재무 데이터 (매출, 영업이익)
  let totalRevenue: number | null = null;
  let operatingIncome: number | null = null;
  let revenueGrowth: number | null = null;
  let profitMargins: number | null = null;

  if (annualRes.ok) {
    try {
      const annual = await annualRes.json();
      const rows: Array<{ title: string; columns: Record<string, { value: string }> }> =
        annual?.financeInfo?.rowList ?? [];
      const titles: Array<{ key: string; isConsensus: string }> =
        annual?.financeInfo?.trTitleList ?? [];

      // 최신 실적 연도 (추정치 제외)
      const actualYears = titles
        .filter((t) => t.isConsensus === "N")
        .map((t) => t.key)
        .sort()
        .reverse();
      const latestYear = actualYears[0];
      const prevYear = actualYears[1];

      if (latestYear) {
        const revenueRow = rows.find((r) => r.title === "매출액");
        const opIncomeRow = rows.find((r) => r.title === "영업이익");
        const netIncomeRow = rows.find((r) => r.title === "당기순이익");

        const latestRevStr = revenueRow?.columns[latestYear]?.value;
        const prevRevStr = prevYear ? revenueRow?.columns[prevYear]?.value : undefined;
        const latestOpStr = opIncomeRow?.columns[latestYear]?.value;
        const latestNetStr = netIncomeRow?.columns[latestYear]?.value;

        // 네이버 재무 데이터 단위: 억원
        if (latestRevStr) {
          const rev = parseFloat(latestRevStr.replace(/,/g, ""));
          if (!isNaN(rev)) totalRevenue = rev * 100_000_000;
        }
        if (latestOpStr) {
          const op = parseFloat(latestOpStr.replace(/,/g, ""));
          if (!isNaN(op)) operatingIncome = op * 100_000_000;
        }
        if (prevRevStr && totalRevenue) {
          const prevRev = parseFloat(prevRevStr.replace(/,/g, ""));
          if (!isNaN(prevRev) && prevRev > 0) {
            revenueGrowth = (totalRevenue - prevRev * 100_000_000) / (prevRev * 100_000_000);
          }
        }
        if (latestNetStr && totalRevenue && totalRevenue > 0) {
          const net = parseFloat(latestNetStr.replace(/,/g, ""));
          if (!isNaN(net)) profitMargins = (net * 100_000_000) / totalRevenue;
        }
      }
    } catch {
      // 연간 데이터 실패해도 기본 정보는 반환
    }
  }

  const dividendYieldRaw = parseNaverValue(getNaverInfo(infos, "dividendYieldRatio"));

  return {
    stockCode,
    stockName,
    currency: "KRW",
    currentPrice: parseNaverValue(getNaverInfo(infos, "closePrice") || getNaverInfo(infos, "nowVal")),
    fiftyTwoWeekHigh: parseNaverValue(getNaverInfo(infos, "highPriceOf52Weeks")),
    fiftyTwoWeekLow: parseNaverValue(getNaverInfo(infos, "lowPriceOf52Weeks")),
    marketCap: parseNaverValue(getNaverInfo(infos, "marketValue")),
    trailingPE: parseNaverValue(getNaverInfo(infos, "per")),
    forwardPE: parseNaverValue(getNaverInfo(infos, "cnsPer")),
    priceToBook: parseNaverValue(getNaverInfo(infos, "pbr")),
    trailingEps: parseNaverValue(getNaverInfo(infos, "eps")),
    dividendYield: dividendYieldRaw != null ? dividendYieldRaw / 100 : null, // % → 소수
    totalRevenue,
    revenueGrowth,
    operatingIncome,
    profitMargins,
    sector: null, // 네이버 integration에서 직접 제공하지 않음
    industry: null,
    longBusinessSummary: null,
    fetchedAt: new Date().toISOString(),
    provider: "네이버 금융",
  };
}

/* ─── Yahoo Finance (미국 주식) ─── */

function num(val: number | undefined): number | null {
  return val != null && isFinite(val) ? val : null;
}

function str(val: string | undefined): string | null {
  return val && val.length > 0 ? val : null;
}

async function fetchYahooFinancials(stockCode: string): Promise<StockFinancials> {
  const result = await yf.quoteSummary(stockCode, {
    modules: ["summaryDetail", "defaultKeyStatistics", "financialData", "summaryProfile"],
  });

  const sd = result.summaryDetail;
  const ks = result.defaultKeyStatistics;
  const fd = result.financialData;
  const sp = result.summaryProfile;

  return {
    stockCode,
    stockName: stockCode,
    currency: sd?.currency ?? "USD",
    currentPrice: num(fd?.currentPrice),
    fiftyTwoWeekHigh: num(sd?.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(sd?.fiftyTwoWeekLow),
    marketCap: num(sd?.marketCap),
    trailingPE: num(sd?.trailingPE),
    forwardPE: num(ks?.forwardPE),
    priceToBook: num(ks?.priceToBook),
    trailingEps: num(ks?.trailingEps),
    dividendYield: num(sd?.dividendYield),
    totalRevenue: num(fd?.totalRevenue),
    revenueGrowth: num(fd?.revenueGrowth),
    operatingIncome: null,
    profitMargins: num(fd?.profitMargins),
    sector: str(sp?.sector),
    industry: str(sp?.industry),
    longBusinessSummary: str(sp?.longBusinessSummary),
    fetchedAt: new Date().toISOString(),
    provider: "Yahoo Finance",
  };
}

/* ─── 통합 진입점 ─── */

function isKoreanStock(stockCode: string, market?: string): boolean {
  return market === "KOSPI" || market === "KOSDAQ" || /^\d{6}$/.test(stockCode);
}

export async function fetchStockFinancials(
  stockCode: string,
  options?: { market?: string },
): Promise<StockFinancials> {
  if (isKoreanStock(stockCode, options?.market)) {
    return fetchNaverFinancials(stockCode);
  }
  return fetchYahooFinancials(stockCode);
}
