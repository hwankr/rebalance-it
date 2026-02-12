export const KIWOOM_BASE_URL =
  process.env.KIWOOM_BASE_URL || "https://api.kiwoom.com";

/** 프록시 URL이 설정되어 있으면 프록시 경유, 아니면 직접 호출 */
export const KIWOOM_PROXY_URL = process.env.KIWOOM_PROXY_URL || "";
export const PROXY_API_KEY = process.env.PROXY_API_KEY || "";

// 키움 REST API 엔드포인트 (모두 POST)
export const ENDPOINTS = {
  TOKEN: "/oauth2/token",
  ACCOUNT: "/api/dostk/acnt",
  ORDER: "/api/dostk/ordr",
  CHART: "/api/dostk/chart",
  STOCK_INFO: "/api/dostk/stkinfo",
  MARKET_CONDITION: "/api/dostk/mrkcond",
} as const;

// 키움 REST API TR 코드
export const API_IDS = {
  // 계좌
  DEPOSITS: "kt00001",
  ESTIMATED_ASSET: "kt00003",
  EVALUATION: "kt00004",
  TRADE_BALANCE: "kt00005",
  UNFILLED_ORDERS: "ka10075",
  FILLED_ORDERS: "ka10076",
  PROFIT_RATES: "ka10085",
  EVALUATION_BALANCE: "kt00018",

  // 주문
  BUY: "kt10000",
  SELL: "kt10001",
  MODIFY: "kt10002",
  CANCEL: "kt10003",

  // 시세
  STOCK_QUOTE: "ka10004",
  CHART_DAY_WEEK_MONTH: "ka10005",

  // 종목
  STOCK_INFO: "ka10099",
} as const;

export function getKiwoomUrl(endpoint: string): string {
  if (KIWOOM_PROXY_URL) {
    return `${KIWOOM_PROXY_URL}/kiwoom${endpoint}`;
  }
  return `${KIWOOM_BASE_URL}${endpoint}`;
}

export function getProxyHeaders(): Record<string, string> {
  if (KIWOOM_PROXY_URL && PROXY_API_KEY) {
    return { "x-proxy-key": PROXY_API_KEY };
  }
  return {};
}

// KRX 호가 단위 테이블
export const PRICE_UNITS = [
  { max: 2_000, unit: 1 },
  { max: 5_000, unit: 5 },
  { max: 20_000, unit: 10 },
  { max: 50_000, unit: 50 },
  { max: 200_000, unit: 100 },
  { max: 500_000, unit: 500 },
  { max: Infinity, unit: 1_000 },
] as const;

/** 주어진 가격에 대한 호가 단위를 반환 */
export function getPriceUnit(price: number): number {
  const entry = PRICE_UNITS.find((e) => price < e.max);
  return entry?.unit ?? 1_000;
}

/** 가격을 호가 단위에 맞게 내림 처리 */
export function adjustToTickSize(price: number): number {
  const unit = getPriceUnit(price);
  return Math.floor(price / unit) * unit;
}

// Rate limit 설정
export const RATE_LIMIT = {
  MIN_INTERVAL_MS: 200,
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 1000,
} as const;
