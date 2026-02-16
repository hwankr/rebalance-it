"use client";

import { m } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
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
  const completed = activeOrders.filter((o) => o.over_executed || getExecutedQty(o) >= o.quantity).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sellOrders = activeOrders.filter((o) => o.side === "sell");
  const buyOrders = activeOrders.filter((o) => o.side === "buy");
  const sellCompleted = sellOrders.filter((o) => o.over_executed || getExecutedQty(o) >= o.quantity).length;
  const buyCompleted = buyOrders.filter((o) => o.over_executed || getExecutedQty(o) >= o.quantity).length;

  // Amount-based progress (use actual_price if available)
  const totalOrderAmount = activeOrders.reduce((sum, o) => sum + o.estimated_amount, 0);
  const executedAmount = activeOrders.reduce(
    (sum, o) => sum + getExecutedQty(o) * (o.actual_price ?? o.estimated_price),
    0
  );
  const amountPercentage = totalOrderAmount > 0
    ? Math.round((executedAmount / totalOrderAmount) * 100)
    : 0;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg">진행률</CardTitle>
            <span className="text-2xl font-bold tabular-nums">
              {percentage}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <m.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm mt-3 text-muted-foreground">
            <span className="tabular-nums">
              전체 {total}건 중 <span className="text-foreground font-medium">{completed}건</span> 체결
            </span>
            <span className="tabular-nums">
              매도{" "}
              <span className="text-red-600 dark:text-red-400 font-medium">
                {sellCompleted}/{sellOrders.length}
              </span>
              {" "}({formatCurrency(totalSellAmount)})
            </span>
            <span className="tabular-nums">
              매수{" "}
              <span className="text-green-600 dark:text-green-400 font-medium">
                {buyCompleted}/{buyOrders.length}
              </span>
              {" "}({formatCurrency(totalBuyAmount)})
            </span>
          </div>
          {amountPercentage !== percentage && (
            <div className="text-xs text-muted-foreground mt-1 tabular-nums">
              금액 기준 진행률: {amountPercentage}% ({formatCurrency(executedAmount)} / {formatCurrency(totalOrderAmount)})
            </div>
          )}
        </CardHeader>
      </Card>
    </m.div>
  );
}
