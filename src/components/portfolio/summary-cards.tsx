"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return <div className="h-4 w-20 bg-muted animate-pulse rounded" />;
}

function profitColor(value: number) {
  if (value > 0) return "text-red-500";
  if (value < 0) return "text-blue-500";
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

function SummaryCard({
  title,
  value,
  numericValue,
  isLoading,
  colored,
}: {
  title: string;
  value: string;
  numericValue: number;
  isLoading: boolean;
  colored?: boolean;
}) {
  const flash = useValueFlash(numericValue);

  return (
    <Card
      className={cn(
        "transition-colors duration-300",
        flash && "bg-accent/50"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton />
        ) : (
          <p
            className={cn(
              "text-2xl font-bold",
              colored && profitColor(numericValue)
            )}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <SummaryCard
        title="총 평가금액"
        value={formatCurrency(totalValue)}
        numericValue={totalValue}
        isLoading={isLoading}
      />
      <SummaryCard
        title="총 손익"
        value={formatCurrency(totalProfitLoss)}
        numericValue={totalProfitLoss}
        isLoading={isLoading}
        colored
      />
      <SummaryCard
        title="수익률"
        value={formatPercent(totalProfitRate)}
        numericValue={totalProfitRate}
        isLoading={isLoading}
        colored
      />
      <SummaryCard
        title="예수금"
        value={formatCurrency(cash)}
        numericValue={cash}
        isLoading={isLoading}
      />
      <SummaryCard
        title="종목 수"
        value={`${stockCount}개`}
        numericValue={stockCount}
        isLoading={isLoading}
      />
    </div>
  );
}
