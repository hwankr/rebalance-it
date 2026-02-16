"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { useExchangeRate } from "@/hooks/use-exchange-rate";

export function ExchangeRateWidget() {
  const {
    rate,
    apiRate,
    updatedAt,
    isManualRate,
    setManualRate,
    clearManualRate,
  } = useExchangeRate();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const showManualInput = isManualRate || isEditing;

  function handleSwitchToManual() {
    setEditValue(String(Math.round(rate)));
    setIsEditing(true);
  }

  function handleSwitchToAuto() {
    clearManualRate();
    setIsEditing(false);
    toast.success("자동 환율로 복원되었습니다.");
  }

  function handleApply() {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed > 0) {
      setManualRate(parsed);
      setIsEditing(false);
      toast.success("환율이 수동 설정되었습니다.");
    }
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && isManualRate) {
          setEditValue(String(rate));
        }
        if (!open) {
          setIsEditing(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 h-8 text-xs font-mono tabular-nums text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <DollarSign className="size-3.5 shrink-0" />
          <span className="hidden md:inline text-muted-foreground/70 font-sans">
            USD/KRW
          </span>
          <span className="font-medium text-foreground">
            {rate.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
          </span>
          {isManualRate && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 md:w-80">
        <PopoverHeader>
          <PopoverTitle>USD/KRW 환율</PopoverTitle>
          <PopoverDescription className="text-xs">
            {updatedAt
              ? `기준: ${format(new Date(updatedAt), "yy.MM.dd HH:mm")}`
              : "갱신 시간 알 수 없음"}
          </PopoverDescription>
        </PopoverHeader>

        <div className="mt-3">
          <div className="text-2xl font-mono tabular-nums font-semibold">
            {rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
          </div>
          {isManualRate && (
            <p className="text-xs text-muted-foreground mt-1">
              자동:{" "}
              {apiRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Auto/Manual segmented toggle */}
        <div className="mt-4">
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            <Button
              variant={!isManualRate && !isEditing ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleSwitchToAuto}
            >
              자동
            </Button>
            <Button
              variant={isManualRate || isEditing ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleSwitchToManual}
            >
              수동
            </Button>
          </div>
        </div>

        {showManualInput && (
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              placeholder={String(apiRate)}
              className="font-mono tabular-nums text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleApply} className="shrink-0">
              적용
            </Button>
          </div>
        )}

        <p className="mt-3 text-[10px] text-muted-foreground/60">
          제공: Open Exchange Rates API (open.er-api.com)
        </p>
      </PopoverContent>
    </Popover>
  );
}
