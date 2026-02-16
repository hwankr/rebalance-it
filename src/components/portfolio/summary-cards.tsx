"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, useTransform } from "framer-motion";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitRate: number;
  cash: number;
  stockCount: number;
  isLoading: boolean;
}

function Skeleton() {
  return <div className="h-4 w-20 skeleton-shimmer rounded" />;
}

function profitColor(value: number) {
  if (value > 0) return "profit-up";
  if (value < 0) return "profit-down";
  return "";
}

function AnimatedNumber({
  value,
  formatter,
}: {
  value: number;
  formatter: (v: number) => string;
}) {
  const spring = useSpring(0, { stiffness: 80, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (latest) => formatter(Math.round(latest)));
  const [displayText, setDisplayText] = useState(formatter(0));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setDisplayText(v));
    return () => unsub();
  }, [display]);

  return <>{displayText}</>;
}

export function SummaryCards({
  totalValue,
  totalProfitLoss,
  totalProfitRate,
  cash,
  stockCount,
  isLoading,
}: SummaryCardsProps) {
  return (
    <div className="section-divider pb-4 mb-3 px-4 md:px-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-muted-foreground">총 자산</span>
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-40 skeleton-shimmer rounded-lg" />
          ) : (
            <h2 className="text-xl md:text-2xl font-bold tracking-tight tabular-nums">
              <AnimatedNumber value={totalValue} formatter={formatCurrency} />
            </h2>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-sm md:text-base overflow-x-auto no-scrollbar">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">총 손익</span>
          {isLoading ? (
            <Skeleton />
          ) : (
            <span className={cn("font-medium tabular-nums", profitColor(totalProfitLoss))}>
              <AnimatedNumber value={totalProfitLoss} formatter={formatCurrency} />
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-border/50" />

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">수익률</span>
          {isLoading ? (
            <Skeleton />
          ) : (
            <span className={cn("font-medium tabular-nums", profitColor(totalProfitRate))}>
              <AnimatedNumber value={totalProfitRate} formatter={formatPercent} />
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-border/50" />

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">예수금</span>
          {isLoading ? (
            <Skeleton />
          ) : (
            <span className="font-medium tabular-nums text-foreground">
              <AnimatedNumber value={cash} formatter={formatCurrency} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
