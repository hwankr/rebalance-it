"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, Pencil, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PortfolioHeroProps {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitRate: number;
  cash: number;
  stockCount: number;
  isLoading: boolean;
  onCashChange?: (cash: number) => void;
  isCashSaving?: boolean;
  dataUpdatedAt?: number;
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

export function PortfolioHero({
  totalValue,
  totalProfitLoss,
  totalProfitRate,
  cash,
  isLoading,
  onCashChange,
  isCashSaving,
}: PortfolioHeroProps) {
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
    <div className="relative overflow-hidden rounded-xl bg-primary px-6 md:px-8 py-8 md:py-10 text-white shadow-xl shadow-primary/20">
      {/* Decorative icon */}
      <Wallet className="absolute top-6 right-6 h-24 w-24 md:h-32 md:w-32 opacity-10" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left side: Portfolio value and stats */}
        <div className="flex flex-col gap-4">
          {/* Total value */}
          <div className="flex flex-col gap-2">
            <span className="uppercase tracking-widest text-sm text-white/80 font-medium">
              총 포트폴리오 가치
            </span>
            {isLoading ? (
              <div className="h-12 md:h-16 w-64 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight tabular-nums">
                <AnimatedNumber value={totalValue} formatter={formatCurrency} />
              </h1>
            )}
          </div>

          {/* Profit/Loss badge */}
          <div className="flex items-center gap-3 flex-wrap">
            {isLoading ? (
              <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse" />
            ) : (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                {isProfitPositive && <TrendingUp className="h-4 w-4" />}
                {isProfitNegative && <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-semibold tabular-nums">
                  <AnimatedNumber value={totalProfitLoss} formatter={formatCurrency} />
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  ({<AnimatedNumber value={totalProfitRate} formatter={formatPercent} />})
                </span>
              </div>
            )}

            {/* Cash display */}
            <div className="flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
              {isLoading ? (
                <div className="h-8 w-40 bg-white/10 rounded-full animate-pulse" />
              ) : isEditing ? (
                <Input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={cancelEditing}
                  disabled={isCashSaving}
                  className="h-8 w-40 text-base font-bold tabular-nums bg-white text-primary border-none"
                  placeholder="0"
                />
              ) : (
                <>
                  <Coins className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-semibold text-white">
                    예수금: <span className="font-bold tabular-nums">
                      <AnimatedNumber value={cash} formatter={formatCurrency} />
                    </span>
                  </span>
                  {onCashChange && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors"
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

        {/* Right side: Action buttons (desktop) */}
        <div className="flex flex-col sm:flex-row gap-3 md:flex-col">
          <Button
            asChild
            size="lg"
            className="bg-white text-primary font-bold rounded-lg hover:bg-white/90 shadow-lg"
          >
            <Link href="/rebalance">리밸런싱</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/20 border border-white/20 text-white font-bold rounded-lg hover:bg-white/30 hover:border-white/30"
          >
            포트폴리오 관리
          </Button>
        </div>
      </div>
    </div>
  );
}
