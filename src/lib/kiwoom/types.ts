// 토큰 관련
export interface KiwoomTokenResponse {
  token: string;
  token_type: string;
  expires_dt?: string;
  expires_in?: number;
}

// 잔고 관련
export interface KiwoomStock {
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  eval_amount: number;
  profit_loss: number;
  profit_rate: number;
  currency?: string;
  native_price?: number;
  native_avg_price?: number;
}

export interface KiwoomBalanceResponse {
  cash: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_rate: number;
  stocks: KiwoomStock[];
}

// 주문 관련
export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market";

export interface KiwoomOrderRequest {
  account: string;
  symbol: string;
  qty: number;
  price?: number;
  side: OrderSide;
  order_type: OrderType;
}

export interface KiwoomOrderResponse {
  order_id: string;
  status: "submitted" | "filled" | "partial" | "rejected";
  message: string;
  filled_qty?: number;
  filled_price?: number;
}

// 종목 정보
export interface KiwoomStockInfo {
  stock_code: string;
  stock_name: string;
  current_price: number;
  change: number;
  change_rate: number;
  volume: number;
  market_cap?: number;
}

// 차트 데이터
export interface KiwoomChartData {
  date: string; // YYYYMMDD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KiwoomChartResponse {
  stock_code: string;
  stock_name: string;
  period: "day" | "week" | "month";
  data: KiwoomChartData[];
}

// 에러
export interface KiwoomErrorResponse {
  error_code: string;
  error_message: string;
}
