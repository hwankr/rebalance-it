"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  startOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";
import {
  DEFAULT_HISTORY_FILTERS,
  type HistoryFilters,
  type DateRange,
} from "@/components/history/history-filter-types";

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  switch (range) {
    case "today":
      return { start: startOfDay(now), end };
    case "7d":
      return { start: startOfDay(subDays(now, 7)), end };
    case "30d":
      return { start: startOfDay(subDays(now, 30)), end };
    case "90d":
      return { start: startOfDay(subDays(now, 90)), end };
    case "this-month":
      return { start: startOfMonth(now), end };
    case "last-month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    default:
      return { start: new Date(0), end };
  }
}

export function useHistoryFilters(
  history: RebalanceExecution[],
  resetKey?: string | null,
) {
  const [filters, setFilters] = useState<HistoryFilters>(
    DEFAULT_HISTORY_FILTERS,
  );

  // Reset filters when resetKey changes (e.g., account switch)
  const prevKey = useRef(resetKey);
  useEffect(() => {
    if (prevKey.current !== resetKey) {
      setFilters(DEFAULT_HISTORY_FILTERS);
      prevKey.current = resetKey;
    }
  }, [resetKey]);

  const filteredHistory = useMemo(() => {
    return history.filter((exec) => {
      // Date range filter
      if (filters.dateRange !== "all") {
        const execDate = new Date(exec.executed_at);
        const { start, end } = getDateRange(filters.dateRange);
        if (execDate < start || execDate > end) return false;
      }

      // Status filter
      if (filters.status !== "all" && exec.status !== filters.status)
        return false;

      // Cash flow filter: net_cash_change === 0 matches "all" only
      if (filters.cashFlow === "inflow" && exec.net_cash_change <= 0)
        return false;
      if (filters.cashFlow === "outflow" && exec.net_cash_change >= 0)
        return false;

      return true;
    });
  }, [history, filters]);

  const isFiltered =
    filters.dateRange !== "all" ||
    filters.status !== "all" ||
    filters.cashFlow !== "all";

  return { filters, setFilters, filteredHistory, isFiltered };
}
