export interface RebalanceExecution {
  id: string;
  profile_id: string;
  profile_name: string;
  executed_at: string;
  status: "completed" | "partial" | "failed";
  total_orders: number;
  success_count: number;
  fail_count: number;
  total_buy_amount: number;
  total_sell_amount: number;
  net_cash_change: number;
  orders: ExecutionOrderResult[];
}

export interface ExecutionOrderResult {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  estimated_price: number;
  estimated_amount: number;
  success: boolean;
  error?: string;
}
