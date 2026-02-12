export interface PortfolioItem {
  stock_code: string;
  stock_name: string;
  current_price: number;
  quantity: number;
  eval_amount: number; // current_price * quantity
  current_pct: number; // 현재 비중 (0-100)
  target_pct: number; // 목표 비중 (0-100)
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
}
