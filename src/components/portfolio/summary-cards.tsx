"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, useTransform } from "framer-motion";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SummaryCardsProps {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitRate: number;
  cash: number;
  stockCount: number;
  isLoading: boolean;
  onCashChange?: (cash: number) => void;
  isCashSaving?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stockCount,
  isLoading,
  onCashChange,
  isCashSaving,
}: SummaryCardsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!onCashChange) return;
    setEditValue(String(cash));
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditValue("");
  }

  function saveEditing() {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed)) {
      toast.error("올바른 숫자를 입력해주세요.");
      cancelEditing();
      return;
    }
    if (parsed < 0) {
      toast.error("예수금은 0 이상이어야 합니다.");
      cancelEditing();
      return;
    }
    const value = Math.max(0, parsed);
    onCashChange?.(value);
    toast.success("예수금이 설정되었습니다.");
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="section-divider pb-4 mb-3 px-4 md:px-0">
      {/* Top row: Total Assets + Cash */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        {/* Total Assets */}
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

        {/* Cash (Elevated) */}
        <div className="flex flex-col gap-0.5 sm:items-end">
          <span className="text-sm font-medium text-muted-foreground">예수금</span>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-8 w-32 skeleton-shimmer rounded-lg" />
            ) : isEditing ? (
              <Input
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={cancelEditing}
                disabled={isCashSaving}
                className="h-8 w-40 text-lg font-bold tabular-nums"
                placeholder="0"
              />
            ) : (
              <>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  <AnimatedNumber value={cash} formatter={formatCurrency} />
                </h2>
                {onCashChange && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="예수금 편집"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Profit/Loss + Return Rate */}
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
      </div>
    </div>
  );
}
