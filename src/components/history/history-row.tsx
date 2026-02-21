"use client";

import { format } from "date-fns";
import { Trash2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getStatusConfig } from "./history-constants";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";

interface HistoryRowProps {
  execution: RebalanceExecution;
  onSelect: (exec: RebalanceExecution) => void;
  onDelete: (id: string) => void;
}

export function HistoryRow({ execution, onSelect, onDelete }: HistoryRowProps) {
  const statusConfig = getStatusConfig(execution.status);
  const isAbandoned = execution.status === "abandoned";
  const date = new Date(execution.executed_at);

  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer group",
        isAbandoned && "opacity-75 hover:opacity-100",
      )}
      onClick={() => onSelect(execution)}
    >
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
        {/* Date + Status */}
        <div className="md:col-span-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              {format(date, "yyyy.MM.dd")}
            </span>
            <span className="text-xs text-muted-foreground mb-2">
              {format(date, "HH:mm")}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit",
                statusConfig.bgColor,
                statusConfig.textColor,
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 mr-1.5 rounded-full",
                  statusConfig.dotColor,
                )}
              />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Trade Count */}
        <div className="md:col-span-2">
          <div className="flex items-center text-sm">
            <Receipt className="size-4 mr-2 text-muted-foreground" />
            <span className="font-medium tabular-nums">
              {execution.total_orders}건
            </span>
            <span className="mx-2 text-muted-foreground/50">|</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded tabular-nums">
              {execution.success_count}/{execution.fail_count}
            </span>
          </div>
        </div>

        {/* Total Buy */}
        <div className="md:col-span-2 md:text-right flex md:block justify-between items-center">
          <span className="md:hidden text-xs text-muted-foreground">
            총 매수
          </span>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums group-hover:text-primary dark:group-hover:text-blue-400 transition-colors",
              isAbandoned && "text-muted-foreground",
            )}
          >
            {formatCurrency(execution.total_buy_amount)}
          </div>
        </div>

        {/* Total Sell */}
        <div className="md:col-span-2 md:text-right flex md:block justify-between items-center">
          <span className="md:hidden text-xs text-muted-foreground">
            총 매도
          </span>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              isAbandoned && "text-muted-foreground",
            )}
          >
            {formatCurrency(execution.total_sell_amount)}
          </div>
        </div>

        {/* Net Cash (P/L) */}
        <div className="md:col-span-3 md:text-right flex md:block justify-between items-center">
          <span className="md:hidden text-xs text-muted-foreground">
            순현금
          </span>
          <div
            className={cn(
              "text-sm font-bold tabular-nums",
              !isAbandoned &&
                execution.net_cash_change > 0 &&
                "text-green-600 dark:text-green-400",
              !isAbandoned &&
                execution.net_cash_change < 0 &&
                "text-red-600 dark:text-red-400",
              isAbandoned &&
                execution.net_cash_change > 0 &&
                "text-green-600/80 dark:text-green-400/80",
              isAbandoned &&
                execution.net_cash_change < 0 &&
                "text-red-600/80 dark:text-red-400/80",
            )}
          >
            {execution.net_cash_change > 0 ? "+" : ""}
            {formatCurrency(execution.net_cash_change)}
          </div>
        </div>

        {/* Delete */}
        <div className="md:col-span-1 flex justify-end md:justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(execution.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
