export type ExecutionStatus = "completed" | "partial" | "failed" | "in_progress" | "abandoned";

export interface ExecutionOrderResult {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  estimated_price: number;
  estimated_amount: number;
  success: boolean;
  error?: string;
  // Progressive rebalancing fields
  executed?: boolean;
  executed_at?: string;
  executed_quantity?: number;
  // Actual execution price tracking
  actual_price?: number;
  actual_amount?: number;
  currency?: string; // "KRW" | "USD"
  // Recalculation support
  over_executed?: boolean; // true when executed_quantity > quantity after recalc
  resolved_by_recalc?: boolean; // true when order becomes unnecessary after recalc
  original_quantity?: number; // pre-recalculation quantity for audit
}

export interface PortfolioSnapshot {
  stocks: Array<{
    stock_code: string;
    stock_name: string;
    quantity: number;
    price: number;
  }>;
  cash: number;
  exchange_rate: number;
  captured_at: string;
}

export interface RebalanceExecution {
  id: string;
  profile_id: string;
  profile_name: string;
  preset_name?: string;
  executed_at: string;
  started_at?: string;
  completed_at?: string;
  status: ExecutionStatus;
  total_orders: number;
  success_count: number;
  fail_count: number;
  total_buy_amount: number;
  total_sell_amount: number;
  net_cash_change: number;
  orders: ExecutionOrderResult[];
  portfolio_snapshot?: PortfolioSnapshot;
  // Recalculation metadata
  recalculated_at?: string;
  recalculation_count?: number;
  recalculated_prices?: Record<string, number>; // stock_code -> price at recalculation time
}
