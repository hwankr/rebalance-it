"use client";

import { useEffect, useRef, useState } from "react";
import { m, useSpring, useTransform } from "framer-motion";
import { Wallet, TrendingUp, Percent, Coins, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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

function useValueFlash(value: number) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value && prevRef.current !== 0) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  useEffect(() => {
    prevRef.current = value;
  }, [value]);

  return flash;
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

function SummaryCard({
  title,
  value,
  numericValue,
  isLoading,
  colored,
  icon: Icon,
  formatter,
  delay = 0,
}: {
  title: string;
  value: string;
  numericValue: number;
  isLoading: boolean;
  colored?: boolean;
  icon: LucideIcon;
  formatter: (v: number) => string;
  delay?: number;
}) {
  const flash = useValueFlash(numericValue);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "glass-card card-hover transition-all duration-300 relative overflow-hidden",
          flash && "value-flash"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton />
          ) : (
            <p
              className={cn(
                "text-2xl font-bold tabular-nums font-mono",
                colored && profitColor(numericValue)
              )}
            >
              <AnimatedNumber value={numericValue} formatter={formatter} />
            </p>
          )}
        </CardContent>
      </Card>
    </m.div>
  );
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <SummaryCard
        title="총 평가금액"
        value={formatCurrency(totalValue)}
        numericValue={totalValue}
        isLoading={isLoading}
        icon={Wallet}
        formatter={formatCurrency}
        delay={0}
      />
      <SummaryCard
        title="총 손익"
        value={formatCurrency(totalProfitLoss)}
        numericValue={totalProfitLoss}
        isLoading={isLoading}
        colored
        icon={TrendingUp}
        formatter={formatCurrency}
        delay={0.08}
      />
      <SummaryCard
        title="수익률"
        value={formatPercent(totalProfitRate)}
        numericValue={totalProfitRate}
        isLoading={isLoading}
        colored
        icon={Percent}
        formatter={formatPercent}
        delay={0.16}
      />
      <SummaryCard
        title="예수금"
        value={formatCurrency(cash)}
        numericValue={cash}
        isLoading={isLoading}
        icon={Coins}
        formatter={formatCurrency}
        delay={0.24}
      />
      <SummaryCard
        title="종목 수"
        value={`${stockCount}개`}
        numericValue={stockCount}
        isLoading={isLoading}
        icon={Hash}
        formatter={(v: number) => `${v}개`}
        delay={0.32}
      />
    </div>
  );
}
