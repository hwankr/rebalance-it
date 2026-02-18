"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateEffectivePortfolio,
  type EffectivePortfolioState,
} from "@/lib/rebalance/effective-portfolio";
import type {
  ExecutionOrderResult,
  PortfolioSnapshot,
} from "@/lib/rebalance/history-types";

interface EffectivePortfolioCardProps {
  orders: ExecutionOrderResult[];
  snapshot: PortfolioSnapshot;
  targetMap: Map<string, number>;
  currencyMap?: Map<string, string>;
  /** 세션 시작 시각 (ISO string). 24h 이상이면 기본 열림 */
  startedAt?: string;
}

export function EffectivePortfolioCard({
  orders,
  snapshot,
  targetMap,
  currencyMap,
  startedAt,
}: EffectivePortfolioCardProps) {
  // 다일 세션(24h+) 여부에 따라 기본 열림/닫힘
  const isMultiDay = (() => {
    if (!startedAt) return false;
    const elapsed = new Date().getTime() - new Date(startedAt).getTime();
    return elapsed > 24 * 60 * 60 * 1000;
  })();

  const [isOpen, setIsOpen] = useState(isMultiDay);

  const effective: EffectivePortfolioState = useMemo(
    () => calculateEffectivePortfolio(snapshot, orders, targetMap, currencyMap),
    [snapshot, orders, targetMap, currencyMap],
  );

  // 체결 주문이 없으면 표시할 의미 없음
  const hasAnyExecution = orders.some((o) => (o.executed_quantity ?? 0) > 0);
  if (!hasAnyExecution) return null;

  const cashPct =
    effective.total_value > 0
      ? (effective.cash / effective.total_value) * 100
      : 0;
  const cashTargetPct = targetMap.get("CASH") ?? 0;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            현재 포트폴리오 상태
          </CardTitle>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
        {!isOpen && (
          <p className="text-xs text-muted-foreground mt-1">
            체결 반영 · {effective.positions.length}종목 · 예수금{" "}
            {formatCurrency(effective.cash)}
          </p>
        )}
      </CardHeader>

      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-3">
              {/* 종목별 현재 상태 */}
              <div className="space-y-1.5">
                {effective.positions.map((pos) => (
                  <div
                    key={pos.stock_code}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">{pos.stock_name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {pos.quantity.toLocaleString("ko-KR")}주
                    </span>
                    <span className="tabular-nums text-xs w-12 text-right">
                      {pos.current_pct.toFixed(1)}%
                    </span>
                    <DriftIndicator drift={pos.drift_pct} />
                  </div>
                ))}
                {/* 현금 */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-muted-foreground">
                    현금
                  </span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {formatCurrency(effective.cash)}
                  </span>
                  <span className="tabular-nums text-xs w-12 text-right">
                    {cashPct.toFixed(1)}%
                  </span>
                  <DriftIndicator drift={cashTargetPct - cashPct} />
                </div>
              </div>

              {/* 총 자산 */}
              <div className="flex justify-between items-center pt-2 border-t text-sm">
                <span className="text-muted-foreground">총 자산</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(effective.total_value)}
                </span>
              </div>
            </CardContent>
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/** 목표 비중과의 차이를 색상으로 표시하는 소형 인디케이터 */
function DriftIndicator({ drift }: { drift: number }) {
  if (Math.abs(drift) < 0.5) {
    return (
      <span className="text-xs tabular-nums w-14 text-right text-muted-foreground">
        -
      </span>
    );
  }
  const isPositive = drift > 0;
  return (
    <span
      className={cn(
        "text-xs tabular-nums w-14 text-right font-medium",
        isPositive
          ? "text-blue-600 dark:text-blue-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      {isPositive ? "+" : ""}
      {drift.toFixed(1)}%
    </span>
  );
}
