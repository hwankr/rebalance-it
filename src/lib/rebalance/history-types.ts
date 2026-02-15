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
}
