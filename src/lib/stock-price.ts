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

/** Yahoo Finance 차트 데이터 (OHLCV) 조회 */
export async function fetchStockChart(
  stockCode: string,
  options?: {
    market?: string;
    period?: "day" | "week" | "month";
    count?: number;
  },
): Promise<{
  stock_code: string;
  stock_name: string;
  period: "day" | "week" | "month";
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}> {
  const period = options?.period ?? "day";
  const count = options?.count ?? 60;

  // Yahoo Finance interval/range mapping
  const intervalMap = { day: "1d", week: "1wk", month: "1mo" } as const;
  const interval = intervalMap[period];
  // Request enough range to cover requested count
  const rangeMap = { day: "1y", week: "5y", month: "10y" } as const;
  const range = rangeMap[period];

  const ticker = toYahooTicker(stockCode, options?.market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo Finance chart API error: ${res.status} for ${ticker}`);
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`차트 데이터를 파싱할 수 없습니다: ${ticker}`);

  const meta = result.meta;
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};

  const data = timestamps
    .map((ts: number, i: number) => {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      const volume = quote.volume?.[i];
      if (open == null || close == null) return null;
      const d = new Date(ts * 1000);
      const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      return {
        date,
        open: Math.round(open * 100) / 100,
        high: Math.round((high ?? open) * 100) / 100,
        low: Math.round((low ?? open) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: volume ?? 0,
      };
    })
    .filter(Boolean) as Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;

  // Trim to requested count (take latest N entries)
  const trimmed = data.slice(-count);

  return {
    stock_code: stockCode,
    stock_name: meta?.shortName ?? meta?.symbol ?? stockCode,
    period,
    data: trimmed,
  };
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
