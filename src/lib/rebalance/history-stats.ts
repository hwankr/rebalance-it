import type { RebalanceExecution } from "./history-types";

export interface HistoryStats {
  /** Sum of net_cash_change across completed/partial executions */
  cumulativeProfit: number;
  /** Sum of net_cash_change for previous month's completed/partial executions */
  previousMonthProfit: number;
  /** Percentage change vs previous month */
  monthOverMonthChange: number;
  /** (total success_count / total total_orders) * 100 across all executions */
  successRate: number;
  /** Count of executions in the current calendar month (all statuses) */
  currentMonthCount: number;
  /** Most recent executed_at timestamp */
  lastExecutionDate: string | null;
}

/**
 * Compute summary stats from the FULL history array (not subscription-filtered).
 * Excludes in_progress/abandoned/failed from profit calculations.
 */
export function computeHistoryStats(history: RebalanceExecution[]): HistoryStats {
  if (history.length === 0) {
    return {
      cumulativeProfit: 0,
      previousMonthProfit: 0,
      monthOverMonthChange: 0,
      successRate: 0,
      currentMonthCount: 0,
      lastExecutionDate: null,
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Only completed/partial contribute to profit
  const profitStatuses = new Set(["completed", "partial"]);
  const profitableExecs = history.filter((e) => profitStatuses.has(e.status));

  const cumulativeProfit = profitableExecs.reduce(
    (sum, e) => sum + e.net_cash_change,
    0,
  );

  const currentMonthProfit = profitableExecs
    .filter((e) => {
      const d = new Date(e.executed_at);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, e) => sum + e.net_cash_change, 0);

  const previousMonthProfit = profitableExecs
    .filter((e) => {
      const d = new Date(e.executed_at);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    })
    .reduce((sum, e) => sum + e.net_cash_change, 0);

  let monthOverMonthChange = 0;
  if (previousMonthProfit !== 0) {
    monthOverMonthChange =
      ((currentMonthProfit - previousMonthProfit) /
        Math.abs(previousMonthProfit)) *
      100;
  }
  if (!Number.isFinite(monthOverMonthChange)) {
    monthOverMonthChange = 0;
  }

  // Success rate across ALL executions (not filtered by status)
  const totalSuccessCount = history.reduce(
    (sum, e) => sum + e.success_count,
    0,
  );
  const totalOrders = history.reduce((sum, e) => sum + e.total_orders, 0);
  let successRate = totalOrders > 0 ? (totalSuccessCount / totalOrders) * 100 : 0;
  if (!Number.isFinite(successRate)) successRate = 0;

  // Current month count (all statuses)
  const currentMonthCount = history.filter((e) => {
    const d = new Date(e.executed_at);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  // Array is already sorted desc by the hook
  const lastExecutionDate = history[0]?.executed_at ?? null;

  return {
    cumulativeProfit,
    previousMonthProfit,
    monthOverMonthChange,
    successRate,
    currentMonthCount,
    lastExecutionDate,
  };
}
