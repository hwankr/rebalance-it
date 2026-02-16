export interface RebalanceSettings {
  id: string;
  strategy: "threshold" | "calendar" | "hybrid";
  threshold_pct: number;
  calendar_interval?: "monthly" | "quarterly" | "yearly";
}

export interface StockTarget {
  id: string;
  stock_code: string;
  stock_name: string;
  target_pct: number;
}
