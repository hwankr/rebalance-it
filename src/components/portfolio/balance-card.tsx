"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, Pencil, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitRate: number;
  cash: number;
  isLoading: boolean;
  onCashChange?: (cash: number) => void;
  isCashSaving?: boolean;
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

export function BalanceCard({
  totalValue,
  totalProfitLoss,
  totalProfitRate,
  cash,
  isLoading,
  onCashChange,
  isCashSaving,
}: BalanceCardProps) {
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

  const isProfitPositive = totalProfitLoss > 0;
  const isProfitNegative = totalProfitLoss < 0;

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 md:p-5">
      {/* Header row: label + profit rate badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          총 포트폴리오 가치
        </p>
        {isLoading ? (
          <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
        ) : (
          <span
            className={cn(
              "text-xs font-bold px-2 py-1 rounded-full",
              isProfitPositive
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                : isProfitNegative
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isProfitPositive ? "+" : ""}
            <AnimatedNumber value={totalProfitRate} formatter={formatPercent} />
          </span>
        )}
      </div>

      {/* Big animated total value */}
      {isLoading ? (
        <div className="h-10 w-56 bg-muted rounded-lg animate-pulse mb-1" />
      ) : (
        <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums text-foreground mb-1">
          <AnimatedNumber value={totalValue} formatter={formatCurrency} />
        </p>
      )}

      {/* Profit/Loss amount line */}
      {isLoading ? (
        <div className="h-4 w-36 bg-muted rounded animate-pulse mb-4" />
      ) : (
        <p
          className={cn(
            "text-sm flex items-center gap-1 mb-3",
            isProfitPositive
              ? "text-green-600 dark:text-green-400"
              : isProfitNegative
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          )}
        >
          {isProfitPositive && <TrendingUp className="h-3.5 w-3.5 shrink-0" />}
          {isProfitNegative && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
          <span className="tabular-nums">
            {isProfitPositive ? "+" : ""}
            <AnimatedNumber value={totalProfitLoss} formatter={formatCurrency} />
          </span>
        </p>
      )}

      {/* Separator */}
      <div className="border-t mb-3" />

      {/* Cash section */}
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
        {isLoading ? (
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        ) : isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={cancelEditing}
            disabled={isCashSaving}
            className="h-7 w-40 text-sm font-bold tabular-nums"
            placeholder="0"
          />
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              예수금:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                <AnimatedNumber value={cash} formatter={formatCurrency} />
              </span>
            </span>
            {onCashChange && (
              <button
                type="button"
                onClick={startEditing}
                className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="예수금 편집"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
