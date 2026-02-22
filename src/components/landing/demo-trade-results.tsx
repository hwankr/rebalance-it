"use client";

import { m } from "framer-motion";
import type { DemoResult } from "@/hooks/use-preset-demo";

interface DemoTradeResultsProps {
  sortedResults: DemoResult[];
  totalAmount: number;
}

export function DemoTradeResults({
  sortedResults,
  totalAmount,
}: DemoTradeResultsProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        매매 가이드 (총 평가금액 ₩{totalAmount.toLocaleString("ko-KR")} 기준)
      </p>
      <div className="rounded-xl border border-border/50 bg-muted/30">
        {sortedResults.map((item, index) => (
          <m.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.12 }}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-none rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                item.action === "매도"
                  ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                  : item.action === "매수"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {item.action}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {item.name}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {item.action === "유지"
                ? "—"
                : `₩${item.amount.toLocaleString("ko-KR")}`}
            </span>
          </m.div>
        ))}
      </div>
    </div>
  );
}
