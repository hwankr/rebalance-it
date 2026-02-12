export const KIWOOM_BASE_URL =
  process.env.KIWOOM_BASE_URL || "https://openapi.kiwoom.com";

export const ENDPOINTS = {
  // 인증
  TOKEN: "/oauth/token",

  // 계좌
  BALANCE: "/v1/account/balance",
  DEPOSITS: "/v1/account/deposits",
  ASSET: "/v1/account/asset",
  UNFILLED_ORDERS: "/v1/account/orders",

  // 주문
  ORDER: "/v1/order",

  // 시세
  STOCK_INFO: "/v1/stock/info",
  ORDERBOOK: "/v1/stock/orderbook",

  // 차트
  CHART: "/api/dostk/chart",
} as const;

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
