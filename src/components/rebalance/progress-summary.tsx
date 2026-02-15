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

export function ProgressSummary({
  orders,
  totalBuyAmount,
  totalSellAmount,
}: ProgressSummaryProps) {
  const total = orders.length;
  const completed = orders.filter((o) => o.executed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sellOrders = orders.filter((o) => o.side === "sell");
  const buyOrders = orders.filter((o) => o.side === "buy");
  const sellCompleted = sellOrders.filter((o) => o.executed).length;
  const buyCompleted = buyOrders.filter((o) => o.executed).length;

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
              className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm mt-3 text-muted-foreground">
            <span className="tabular-nums">
              전체 {total}건 중 <span className="text-foreground font-medium">{completed}건</span> 완료
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
        </CardHeader>
      </Card>
    </m.div>
  );
}
