import { STATUS_CONFIG } from "./history-constants";

export type DateRange =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "this-month"
  | "last-month";

export type StatusFilter =
  | "all"
  | "completed"
  | "partial"
  | "failed"
  | "in_progress"
  | "abandoned";

export type CashFlowFilter = "all" | "inflow" | "outflow";

export interface HistoryFilters {
  dateRange: DateRange;
  status: StatusFilter;
  cashFlow: CashFlowFilter;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  dateRange: "all",
  status: "all",
  cashFlow: "all",
};

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: "전체 기간",
  today: "오늘",
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
  "this-month": "이번 달",
  "last-month": "지난 달",
};

/** Derive status labels from shared STATUS_CONFIG */
export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "전체 상태",
  completed: STATUS_CONFIG.completed.label,
  partial: STATUS_CONFIG.partial.label,
  failed: STATUS_CONFIG.failed.label,
  in_progress: STATUS_CONFIG.in_progress.label,
  abandoned: STATUS_CONFIG.abandoned.label,
};

export const CASH_FLOW_LABELS: Record<CashFlowFilter, string> = {
  all: "전체",
  inflow: "순유입",
  outflow: "순유출",
};
