"use client";

import { useState, useCallback } from "react";
import type { Asset } from "@/hooks/use-preset-demo";

interface DemoAllocationSlidersProps {
  assets: Asset[];
  allocations: Record<string, number>;
  onAllocationChange: (assetId: string, value: number) => void;
  allocationSum: number;
  totalAmount: number;
  onTotalAmountChange: (amount: number) => void;
}

const MIN_AMOUNT = 1_000_000;
const MAX_AMOUNT = 1_000_000_000;

function getSumColor(sum: number): string {
  if (sum >= 95 && sum <= 105) return "bg-emerald-500";
  if ((sum >= 85 && sum < 95) || (sum > 105 && sum <= 115)) return "bg-yellow-500";
  return "bg-red-500";
}

function getSumTextColor(sum: number): string {
  if (sum >= 95 && sum <= 105) return "text-emerald-600 dark:text-emerald-400";
  if ((sum >= 85 && sum < 95) || (sum > 105 && sum <= 115))
    return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function DemoAllocationSliders({
  assets,
  allocations,
  onAllocationChange,
  allocationSum,
  totalAmount,
  onTotalAmountChange,
}: DemoAllocationSlidersProps) {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  const handleAmountClick = useCallback(() => {
    setAmountInput(String(totalAmount));
    setIsEditingAmount(true);
  }, [totalAmount]);

  const handleAmountBlur = useCallback(() => {
    const parsed = parseInt(amountInput.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, parsed));
      onTotalAmountChange(clamped);
    }
    setIsEditingAmount(false);
  }, [amountInput, onTotalAmountChange]);

  const handleAmountKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-bold text-foreground">현재 비중 설정</p>
        <p className="mt-1 text-sm text-muted-foreground">
          슬라이더를 움직여서 현재 보유 비중을 입력해보세요
        </p>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span
                  className="inline-block h-2 w-2 flex-none rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                {asset.name}
                <span className="text-xs text-muted-foreground">
                  (목표: {asset.target}%)
                </span>
              </label>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {allocations[asset.id]}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={allocations[asset.id]}
              onChange={(e) =>
                onAllocationChange(asset.id, Number(e.target.value))
              }
              className="w-full"
              aria-label={asset.name + " 현재 비중"}
            />
          </div>
        ))}
      </div>

      {/* Sum bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-semibold tabular-nums ${getSumTextColor(allocationSum)}`}>
            합계: {allocationSum}%
          </span>
          {allocationSum !== 100 && (
            <span className="text-xs text-muted-foreground">
              합계가 100%가 아닙니다
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getSumColor(allocationSum)}`}
            style={{ width: `${Math.min(allocationSum, 100)}%` }}
          />
        </div>
      </div>

      {/* Total amount */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          총 평가금액
        </span>
        {isEditingAmount ? (
          <input
            type="text"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onBlur={handleAmountBlur}
            onKeyDown={handleAmountKeyDown}
            autoFocus
            className="w-36 rounded border border-border bg-background px-2 py-0.5 text-right text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
            aria-label="총 평가금액 입력"
          />
        ) : (
          <button
            onClick={handleAmountClick}
            className="text-sm font-semibold tabular-nums text-foreground hover:text-primary transition-colors"
            aria-label="총 평가금액 수정"
          >
            ₩{totalAmount.toLocaleString("ko-KR")}
          </button>
        )}
      </div>
    </div>
  );
}
