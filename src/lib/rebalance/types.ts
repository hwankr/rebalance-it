export interface PortfolioItem {
  stock_code: string;
  stock_name: string;
  current_price: number;
  quantity: number;
  eval_amount: number; // current_price * quantity
  current_pct: number; // 현재 비중 (0-100)
  target_pct: number; // 목표 비중 (0-100)
  is_cash?: boolean; // 현금 자산 여부
  currency?: string; // "KRW" | "USD" — 호가 단위 적용 판단용
}

export interface DriftResult {
  stock_code: string;
  stock_name: string;
  current_pct: number;
  target_pct: number;
  drift_pct: number; // target - current (양수: 매수 필요, 음수: 매도 필요)
  drift_amount: number; // drift에 해당하는 금액
}

export interface RebalanceOrder {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  estimated_price: number;
  estimated_amount: number; // quantity * estimated_price
}

export interface RebalanceResult {
  orders: RebalanceOrder[];
  drift_before: DriftResult[];
  estimated_drift_after: DriftResult[];
  total_buy_amount: number;
  total_sell_amount: number;
  net_cash_change: number; // 매도 - 매수 (양수: 현금 증가)
  cash_after: number;
}

export interface TargetAllocation {
  stock_code: string;
  stock_name: string;
  target_pct: number;
  is_cash?: boolean; // 현금 자산 여부
}

// --- 포트폴리오 데이터 모델 ---

export interface Stock {
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

export interface BalanceResponse {
  cash: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_rate: number;
  stocks: Stock[];
}

// --- 차트 데이터 ---

export interface ChartData {
  date: string; // YYYYMMDD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  stock_code: string;
  stock_name: string;
  period: "day" | "week" | "month";
  data: ChartData[];
}
