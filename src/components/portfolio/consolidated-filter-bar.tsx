"use client";

import type { AccountBreakdown } from "@/hooks/use-consolidated-portfolio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillToggle } from "@/components/ui/pill-toggle";

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

const PILL_SELECT_TRIGGER =
  "rounded-full border-0 bg-muted text-muted-foreground hover:bg-accent px-3 py-1.5 text-xs font-medium h-auto shadow-none gap-1 min-w-fit data-[state=open]:bg-foreground data-[state=open]:text-background";

interface ConsolidatedFilterBarProps {
  filters: ConsolidatedFilters;
  onFiltersChange: (filters: ConsolidatedFilters) => void;
  breakdown: AccountBreakdown[];
  filteredCount: number;
  totalCount: number;
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
    <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
      {/* 계좌 필터 */}
      <Select
        value={filters.accountId}
        onValueChange={(v) => update({ accountId: v })}
      >
        <SelectTrigger className={PILL_SELECT_TRIGGER}>
          <SelectValue placeholder="계좌" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="min-w-[130px]">
          <SelectItem value="all">전체 계좌</SelectItem>
          {breakdown.map((b) => (
            <SelectItem key={b.accountId} value={b.accountId}>
              {b.accountName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 정렬 */}
      <Select
        value={filters.sortBy}
        onValueChange={(v) =>
          update({ sortBy: v as ConsolidatedFilters["sortBy"] })
        }
      >
        <SelectTrigger className={PILL_SELECT_TRIGGER}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="min-w-[120px]">
          <SelectItem value="eval_amount">평가금액순</SelectItem>
          <SelectItem value="profit_rate">수익률순</SelectItem>
          <SelectItem value="name">이름순</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-border shrink-0" />

      {/* 통화 필터 */}
      <PillToggle
        size="sm"
        value={filters.currency}
        onChange={(v) => update({ currency: v })}
        options={[
          { value: "all", label: "전체" },
          { value: "KRW", label: "KRW" },
          { value: "USD", label: "USD" },
        ]}
      />

      <div className="w-px h-4 bg-border shrink-0" />

      {/* 수익/손실 필터 */}
      <PillToggle
        size="sm"
        value={filters.profitStatus}
        onChange={(v) => update({ profitStatus: v })}
        options={[
          { value: "all", label: "전체" },
          { value: "profit", label: "수익" },
          { value: "loss", label: "손실" },
        ]}
      />

      {/* 필터 결과 표시 */}
      {isFiltered && (
        <div className="ml-auto flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
          <span>
            {filteredCount}/{totalCount}
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
