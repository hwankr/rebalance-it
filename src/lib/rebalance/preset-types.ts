export interface PresetTarget {
  stock_code: string;
  stock_name: string;
  target_pct: number;
}

export interface Preset {
  id: string;
  name: string;
  targets: PresetTarget[];
  created_at: string;
  updated_at: string;
}

export interface RebalanceSettings {
  id: string;
  data_source: "kiwoom" | "manual";
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
