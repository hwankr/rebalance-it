export interface ProfileTarget {
  stock_code: string;
  stock_name: string;
  target_pct: number;
}

export interface RebalanceProfile {
  id: string;
  name: string;
  strategy: "threshold" | "calendar" | "hybrid";
  threshold_pct: number;
  calendar_interval?: "monthly" | "quarterly" | "yearly";
  targets: ProfileTarget[];
  created_at: string;
  updated_at: string;
}
