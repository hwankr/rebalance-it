"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";

interface ProgressSummaryProps {
  orders: ExecutionOrderResult[];
  totalBuyAmount: number;
  totalSellAmount: number;
}

function getExecutedQty(order: ExecutionOrderResult): number {
  if (order.executed_quantity !== undefined) return order.executed_quantity;
  return order.executed ? order.quantity : 0;
}

export function ProgressSummary({
  orders,
  totalBuyAmount,
  totalSellAmount,
}: ProgressSummaryProps) {
  // Filter out resolved orders (no longer needed after recalculation)
  const activeOrders = orders.filter((o) => !o.resolved_by_recalc);
  const total = activeOrders.length;
  const completed = activeOrders.filter(
    (o) => o.over_executed || getExecutedQty(o) >= o.quantity
  ).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sellOrders = activeOrders.filter((o) => o.side === "sell");
  const buyOrders = activeOrders.filter((o) => o.side === "buy");
  const sellCompleted = sellOrders.filter(
    (o) => o.over_executed || getExecutedQty(o) >= o.quantity
  ).length;
  const buyCompleted = buyOrders.filter(
    (o) => o.over_executed || getExecutedQty(o) >= o.quantity
  ).length;

  const sellDone = sellOrders.length > 0 && sellCompleted === sellOrders.length;
  const buyDone = buyOrders.length > 0 && buyCompleted === buyOrders.length;

  // Amount-based progress (use actual_price if available)
  const totalOrderAmount = activeOrders.reduce(
    (sum, o) => sum + o.estimated_amount,
    0
  );
  const executedAmount = activeOrders.reduce(
    (sum, o) => sum + getExecutedQty(o) * (o.actual_price ?? o.estimated_price),
    0
  );
  const amountPercentage =
    totalOrderAmount > 0
      ? Math.round((executedAmount / totalOrderAmount) * 100)
      : 0;

  // Amount delta calculation
  const actualSellAmt = sellOrders.reduce(
    (sum, o) => sum + getExecutedQty(o) * (o.actual_price ?? o.estimated_price),
    0
  );
  const actualBuyAmt = buyOrders.reduce(
    (sum, o) => sum + getExecutedQty(o) * (o.actual_price ?? o.estimated_price),
    0
  );
  const sDelta = actualSellAmt - totalSellAmount;
  const bDelta = actualBuyAmt - totalBuyAmount;
  const hasExec = actualSellAmt > 0 || actualBuyAmt > 0;
  const hasDelta = hasExec && (sDelta !== 0 || bDelta !== 0);

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-3xl p-6 shadow-sm border border-border/50"
    >
      {/* Top row: label + counter */}
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <span className="text-sm text-muted-foreground font-medium">
            진행률
          </span>
          <span className="ml-3 text-3xl font-bold tabular-nums tracking-tight">
            {percentage}%
          </span>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {completed}/{total} 체결
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden mt-3">
        <m.div
          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Section badges */}
      <div className="flex items-center gap-2 mt-3">
        {sellOrders.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
              sellDone
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {sellDone && <Check className="size-3" />}
            매도 {sellCompleted}/{sellOrders.length}
            {sellDone && " ✓"}
          </span>
        )}
        {buyOrders.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
              buyDone
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            {buyDone && <Check className="size-3" />}
            매수 {buyCompleted}/{buyOrders.length}
            {buyDone && " ✓"}
          </span>
        )}
      </div>

      {/* Amount-based progress (only when it differs from count %) */}
      {amountPercentage !== percentage && (
        <div className="text-xs text-muted-foreground mt-2 tabular-nums">
          금액 기준 진행률: {amountPercentage}% ({formatCurrency(executedAmount)}{" "}
          / {formatCurrency(totalOrderAmount)})
        </div>
      )}

      {/* Amount delta section */}
      {hasDelta && (
        <div className="text-xs text-muted-foreground mt-2 space-y-0.5 tabular-nums border-t pt-2">
          {actualSellAmt > 0 && sDelta !== 0 && (
            <div className="flex justify-between">
              <span>매도 대금 차이</span>
              <span
                className={cn(
                  "font-medium",
                  sDelta > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {sDelta > 0 ? "+" : ""}
                {formatCurrency(sDelta)}
              </span>
            </div>
          )}
          {actualBuyAmt > 0 && bDelta !== 0 && (
            <div className="flex justify-between">
              <span>매수 대금 차이</span>
              <span
                className={cn(
                  "font-medium",
                  bDelta < 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {bDelta > 0 ? "+" : ""}
                {formatCurrency(bDelta)}
              </span>
            </div>
          )}
        </div>
      )}
    </m.div>
  );
}
