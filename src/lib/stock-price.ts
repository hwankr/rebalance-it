/**
 * Yahoo Finance를 사용한 주식 가격 조회
 * - 미국 주식: 티커 그대로 (AAPL, MSFT)
 * - 한국 주식: 종목코드 + 시장 suffix (.KS = KOSPI, .KQ = KOSDAQ)
 */

export interface StockPriceResult {
  price: number;
  /** ISO 8601 timestamp of the last regular market trade, or null if unavailable */
  marketTime: string | null;
  /** Mapped exchange name (e.g. "KOSPI", "NASDAQ"), or "Unknown" if unmapped */
  exchangeName: string;
}

/** Yahoo exchangeName → user-facing market name */
const EXCHANGE_MAP: Record<string, string> = {
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NYQ: "NYSE",
  PCX: "NYSE",
  KSC: "KOSPI",
  KSE: "KOSPI",
  KOE: "KOSDAQ",
};

function toYahooTicker(stockCode: string, market?: string): string {
  if (!market) return stockCode;
  const m = market.toUpperCase();
  if (m === "KOSPI") return `${stockCode}.KS`;
  if (m === "KOSDAQ") return `${stockCode}.KQ`;
  // US stocks (NYSE, NASDAQ) use ticker as-is
  return stockCode;
}

export async function fetchStockPrice(
  stockCode: string,
  options?: { currency?: string; market?: string },
): Promise<StockPriceResult> {
  const ticker = toYahooTicker(stockCode, options?.market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status} for ${ticker}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number") {
    throw new Error(`가격 정보를 파싱할 수 없습니다: ${ticker}`);
  }

  const rawTime = meta?.regularMarketTime;
  const marketTime =
    typeof rawTime === "number"
      ? new Date(rawTime * 1000).toISOString()
      : null;

  const rawExchange: string = meta?.exchangeName ?? "";
  const exchangeName = EXCHANGE_MAP[rawExchange] ?? (rawExchange || "Unknown");

  return { price, marketTime, exchangeName };
}

/** Batch fetch stock prices for multiple stocks */
export async function fetchStockPrices(
  stocks: Array<{ stock_code: string; currency?: string; market?: string }>,
): Promise<Map<string, StockPriceResult>> {
  const results = new Map<string, StockPriceResult>();
  // Fetch in parallel with individual error handling
  const promises = stocks.map(async (stock) => {
    try {
      const result = await fetchStockPrice(stock.stock_code, {
        currency: stock.currency,
        market: stock.market,
      });
      results.set(stock.stock_code, result);
    } catch {
      // Skip stocks that fail to fetch — caller can compare against missing entries
    }
  });
  await Promise.allSettled(promises);
  return results;
}
