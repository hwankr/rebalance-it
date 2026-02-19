"use client";

import type { AccountBreakdown } from "@/hooks/use-consolidated-portfolio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ConsolidatedFilters {
  accountId: "all" | string;
  currency: "all" | "KRW" | "USD";
  profitStatus: "all" | "profit" | "loss";
  sortBy: "eval_amount" | "profit_rate" | "name";
}

export const DEFAULT_FILTERS: ConsolidatedFilters = {
  accountId: "all",
  currency: "all",
  profitStatus: "all",
  sortBy: "eval_amount",
};

interface ConsolidatedFilterBarProps {
  filters: ConsolidatedFilters;
  onFiltersChange: (filters: ConsolidatedFilters) => void;
  breakdown: AccountBreakdown[];
  filteredCount: number;
  totalCount: number;
}

function PillToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            value === option.value
              ? "bg-foreground text-background shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ConsolidatedFilterBar({
  filters,
  onFiltersChange,
  breakdown,
  filteredCount,
  totalCount,
}: ConsolidatedFilterBarProps) {
  const isFiltered =
    filters.accountId !== "all" ||
    filters.currency !== "all" ||
    filters.profitStatus !== "all";

  function update(patch: Partial<ConsolidatedFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {/* 계좌 필터 */}
        <Select
          value={filters.accountId}
          onValueChange={(v) => update({ accountId: v })}
        >
          <SelectTrigger size="sm" className="h-8 text-xs min-w-[100px]">
            <SelectValue placeholder="계좌" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 계좌</SelectItem>
            {breakdown.map((b) => (
              <SelectItem key={b.accountId} value={b.accountId}>
                {b.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 통화 필터 */}
        <PillToggle
          value={filters.currency}
          onChange={(v) => update({ currency: v })}
          options={[
            { value: "all", label: "전체" },
            { value: "KRW", label: "KRW" },
            { value: "USD", label: "USD" },
          ]}
        />

        {/* 수익상태 필터 */}
        <PillToggle
          value={filters.profitStatus}
          onChange={(v) => update({ profitStatus: v })}
          options={[
            { value: "all", label: "전체" },
            { value: "profit", label: "수익" },
            { value: "loss", label: "손실" },
          ]}
        />

        {/* 정렬 */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) =>
            update({ sortBy: v as ConsolidatedFilters["sortBy"] })
          }
        >
          <SelectTrigger size="sm" className="h-8 text-xs min-w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eval_amount">평가금액순</SelectItem>
            <SelectItem value="profit_rate">수익률순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 필터 결과 표시 */}
      {isFiltered && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {filteredCount} / {totalCount} 종목
          </span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, sortBy: filters.sortBy })}
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
