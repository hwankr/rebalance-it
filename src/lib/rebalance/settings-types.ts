export interface RebalanceSettings {
  id: string;
  strategy: "threshold" | "calendar" | "hybrid";
  threshold_pct: number;
  calendar_interval?: "monthly" | "quarterly" | "yearly";
}
