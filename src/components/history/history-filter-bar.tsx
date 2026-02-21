"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillToggle, PILL_SELECT_TRIGGER } from "@/components/ui/pill-toggle";
import {
  DEFAULT_HISTORY_FILTERS,
  DATE_RANGE_LABELS,
  STATUS_FILTER_LABELS,
  CASH_FLOW_LABELS,
  type HistoryFilters,
  type DateRange,
  type StatusFilter,
  type CashFlowFilter,
} from "./history-filter-types";

interface HistoryFilterBarProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  filteredCount: number;
  totalCount: number;
}

export function HistoryFilterBar({
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
}: HistoryFilterBarProps) {
  const isFiltered =
    filters.dateRange !== "all" ||
    filters.status !== "all" ||
    filters.cashFlow !== "all";

  function update(patch: Partial<HistoryFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* Date range filter */}
      <Select
        value={filters.dateRange}
        onValueChange={(v) => update({ dateRange: v as DateRange })}
      >
        <SelectTrigger className={PILL_SELECT_TRIGGER}>
          <SelectValue placeholder="기간" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="min-w-[130px]">
          {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(
            ([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-border shrink-0" />

      {/* Status filter */}
      <Select
        value={filters.status}
        onValueChange={(v) => update({ status: v as StatusFilter })}
      >
        <SelectTrigger className={PILL_SELECT_TRIGGER}>
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="min-w-[120px]">
          {(
            Object.entries(STATUS_FILTER_LABELS) as [StatusFilter, string][]
          ).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-border shrink-0" />

      {/* Cash flow direction filter */}
      <PillToggle
        size="sm"
        value={filters.cashFlow}
        onChange={(v) => update({ cashFlow: v as CashFlowFilter })}
        options={
          (Object.entries(CASH_FLOW_LABELS) as [CashFlowFilter, string][]).map(
            ([value, label]) => ({ value, label }),
          )
        }
      />

      {/* Filter count + reset */}
      {isFiltered && (
        <div className="ml-auto flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
          <span>
            {filteredCount}/{totalCount}
          </span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => onFiltersChange(DEFAULT_HISTORY_FILTERS)}
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
