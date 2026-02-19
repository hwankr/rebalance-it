"use client";

import { useState, useMemo } from "react";
import { Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/stock-logo";

const ASSET_COLORS = [
  "#db2777", "#2563eb", "#9333ea", "#10b981",
  "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];
const CASH_COLOR = "#fb923c";

interface TargetWeightEditorProps {
  stocks: Array<{
    id: string;
    stock_code: string;
    stock_name: string;
    quantity: number;
    current_price: number;
    currency: string;
    target_pct: number;
    is_rebalance_tracked?: boolean;
  }>;
  cashAmount: number;
  exchangeRate: number;
  onSave: (updates: { id: string; targetPct: number }[]) => void;
  isSaving: boolean;
  /** "always-edit": 항상 입력 모드 (기존 동작). "inline": 읽기전용 → 편집 토글. */
  mode?: "always-edit" | "inline";
  /** 오른쪽 컬럼에 렌더링할 차트 (ex: AllocationChart) */
  chart?: React.ReactNode;
}

/* ── Actionable Row (ex.js 기반 리밸런싱 가이드 행) ── */
function ActionableRow({
  name,
  code,
  currentPct,
  targetPct,
  hexColor,
  isCash,
  isExcluded,
}: {
  name: string;
  code?: string;
  currentPct: number;
  targetPct: number;
  hexColor: string;
  isCash?: boolean;
  isExcluded?: boolean;
}) {
  const maxScale = 40;
  const currentWidth = Math.min((currentPct / maxScale) * 100, 100);
  const targetLeft = Math.min((targetPct / maxScale) * 100, 100);

  return (
    <div
      className={cn(
        "py-4 px-4",
        isCash
          ? "bg-muted/30 rounded-lg border border-border/50 mb-2"
          : "border-b border-border/30 last:border-0",
        isExcluded && "opacity-50"
      )}
    >
      {/* Desktop */}
      <div className="hidden md:flex items-center">
        {/* Identity */}
        <div className="w-[140px] flex items-center gap-3 shrink-0">
          <div
            className="w-3 h-8 rounded-full shrink-0"
            style={{ backgroundColor: hexColor }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold">{name}</span>
            {code && (
              <span className="text-xs text-muted-foreground">{code}</span>
            )}
            {isCash && (
              <span className="text-[10px] text-orange-500 font-medium">
                유동성 자산
              </span>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex-1 px-6 relative h-10 flex flex-col justify-center group cursor-help">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
            현재 {currentPct.toFixed(1)}% vs 목표 {targetPct.toFixed(1)}%
          </div>
          <div className="relative h-3 bg-muted rounded-full w-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 opacity-90"
              style={{
                width: `${currentWidth}%`,
                backgroundColor: hexColor,
              }}
            />
          </div>
          {!isExcluded && targetPct > 0 && (
            <div
              className="absolute top-2 bottom-2 w-0.5 bg-foreground z-10 transition-all duration-500 shadow-[0_0_4px_rgba(0,0,0,0.2)]"
              style={{ left: `calc(${targetLeft}% + 24px)` }}
            >
              <div className="absolute -top-1 -left-[3px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-foreground" />
            </div>
          )}
        </div>

        {/* Current / Target */}
        <div className="w-[110px] flex justify-end shrink-0">
          {isExcluded ? (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">제외</span>
          ) : (
            <span className="text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{currentPct.toFixed(1)}%</span>
              {" / "}
              <span>{targetPct.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-6 rounded-full shrink-0"
            style={{ backgroundColor: hexColor }}
          />
          <div>
            <span className="text-sm font-bold">{name}</span>
            {isCash && (
              <span className="text-[10px] text-orange-500 font-medium ml-1">
                유동성
              </span>
            )}
          </div>
        </div>
        <div>
          {isExcluded ? (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">제외</span>
          ) : (
            <span className="text-xs tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{currentPct.toFixed(1)}%</span>
              {" / "}
              <span>{targetPct.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TargetWeightEditor({
  stocks,
  cashAmount,
  exchangeRate,
  onSave,
  isSaving,
  mode = "always-edit",
  chart,
}: TargetWeightEditorProps) {
  const [isEditing, setIsEditing] = useState(mode === "always-edit");
  const [edits, setEdits] = useState<Record<string, number>>({});

  const modifiedStocks = useMemo(() => {
    return new Set(
      stocks
        .filter((s) => s.id in edits && edits[s.id] !== (s.target_pct ?? 0))
        .map((s) => s.id)
    );
  }, [stocks, edits]);

  const stockData = useMemo(() => {
    return stocks.map((stock) => {
      const evalAmount =
        stock.currency === "USD"
          ? stock.current_price * exchangeRate * stock.quantity
          : stock.current_price * stock.quantity;
      return { ...stock, evalAmount };
    });
  }, [stocks, exchangeRate]);

  const totalValue = useMemo(() => {
    return stockData.reduce((sum, s) => sum + s.evalAmount, 0) + cashAmount;
  }, [stockData, cashAmount]);

  const stocksWithPcts = useMemo(() => {
    return stockData.map((stock) => ({
      ...stock,
      currentPct: totalValue > 0 ? (stock.evalAmount / totalValue) * 100 : 0,
      targetPct: edits[stock.id] ?? stock.target_pct ?? 0,
    }));
  }, [stockData, totalValue, edits]);

  const cashCurrentPct = totalValue > 0 ? (cashAmount / totalValue) * 100 : 0;

  const totalStockTargetPct = useMemo(() => {
    return stocks
      .filter((s) => s.is_rebalance_tracked !== false)
      .reduce(
        (sum, s) => sum + (edits[s.id] ?? s.target_pct ?? 0),
        0
      );
  }, [stocks, edits]);

  const cashTargetPct = Math.max(0, 100 - totalStockTargetPct);
  const isValid = totalStockTargetPct <= 100;
  const hasChanges = modifiedStocks.size > 0;
  const hasAnyTargets = stocks.some((s) => s.target_pct > 0);

  const handleTargetPctChange = (stockId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setEdits((prev) => ({ ...prev, [stockId]: 0 }));
    } else {
      setEdits((prev) => ({
        ...prev,
        [stockId]: Math.max(0, Math.min(100, numValue)),
      }));
    }
  };

  const handleSave = () => {
    const updates = Array.from(modifiedStocks).map((id) => ({
      id,
      targetPct: edits[id],
    }));
    onSave(updates);
    setEdits({});
    if (mode === "inline") setIsEditing(false);
  };

  const handleCancel = () => {
    setEdits({});
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setEdits({});
    setIsEditing(true);
  };

  // ── Inline 모드: 타겟 미설정 시 빈 상태 프롬프트 ──
  if (mode === "inline" && !isEditing && !hasAnyTargets) {
    return (
      <section className="bg-card rounded-xl shadow-sm border p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg">목표 비중</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleStartEditing}
          >
            <Pencil className="size-3.5" />
            비중 설정
          </Button>
        </div>
        <div className={cn("grid grid-cols-1 gap-8 items-start", chart && "lg:grid-cols-12")}>
          <div className={chart ? "lg:col-span-7" : ""}>
            <div className="flex flex-col items-center gap-3 py-6 px-4 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                목표 비중을 설정하면 현재 포트폴리오와 비교하여
                리밸런싱을 실행할 수 있습니다.
              </p>
            </div>
          </div>
          {chart && (
            <div className="lg:col-span-5">{chart}</div>
          )}
        </div>
      </section>
    );
  }

  // ── Inline 모드: 읽기전용 뷰 (리밸런싱 가이드 — ex.js 기반) ──
  if (mode === "inline" && !isEditing) {
    return (
      <section className="bg-card rounded-xl shadow-sm border p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold">리밸런싱 가이드</h2>
            <p className="text-xs text-muted-foreground mt-1">
              목표 비중 달성을 위한 예상 매매 금액입니다.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleStartEditing}
          >
            <Pencil className="size-3" />
            목표 수정
          </Button>
        </div>

        {/* Content: ActionableRows (left) + Chart (right) */}
        <div className={cn("grid grid-cols-1 gap-8 items-start", chart && "lg:grid-cols-12")}>
          <div className={chart ? "lg:col-span-7" : ""}>
            <div className="space-y-1">
              {/* Cash row */}
              <ActionableRow
                name="현금 (KRW)"
                currentPct={parseFloat(cashCurrentPct.toFixed(1))}
                targetPct={parseFloat(cashTargetPct.toFixed(1))}
                hexColor={CASH_COLOR}
                isCash
              />
              {/* Stock rows */}
              {stocksWithPcts
                .filter((d) => d.targetPct > 0 || d.currentPct > 0.1)
                .map((d, i) => (
                  <ActionableRow
                    key={d.id}
                    name={d.stock_name}
                    code={d.stock_code}
                    currentPct={parseFloat(d.currentPct.toFixed(1))}
                    targetPct={d.targetPct}
                    hexColor={
                      ASSET_COLORS[i % ASSET_COLORS.length]
                    }
                    isExcluded={d.is_rebalance_tracked === false}
                  />
                ))}
            </div>
          </div>

          {/* Right: Chart */}
          {chart && (
            <div className="lg:col-span-5">{chart}</div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border/50 hidden md:flex gap-4 text-xs text-muted-foreground justify-end">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded-sm" />
            <span>현재 비중 (Bar)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3 bg-foreground" />
            <span>목표 비중 (Line)</span>
          </div>
        </div>
      </section>
    );
  }

  // ── 편집 모드 (always-edit 또는 inline 편집 중) ──
  return (
    <section className="bg-card rounded-xl shadow-sm border p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-lg">목표 비중 설정</h2>
        <div className="flex items-center gap-3">
          {mode === "inline" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCancel}
            >
              취소
            </Button>
          )}
          <button
            type="button"
            className="text-xs text-primary font-medium hover:underline"
            onClick={() => {
              const resets: Record<string, number> = {};
              stocks.forEach((s) => {
                resets[s.id] = 0;
              });
              setEdits(resets);
            }}
          >
            비중 초기화
          </button>
        </div>
      </div>

      {/* 2-column grid: Stock Rows (left) + Chart (right) */}
      <div
        className={cn(
          "grid grid-cols-1 gap-8 items-start",
          chart && "lg:grid-cols-2"
        )}
      >
        {/* Left Column: Stock Card Rows */}
        <div className="space-y-4">
          {stocksWithPcts.map((stock) => {
            const isUntracked =
              stock.is_rebalance_tracked === false;

            return (
              <div
                key={stock.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isUntracked
                    ? "bg-muted/30 border-border/50"
                    : "bg-card border-border hover:border-primary/30"
                )}
              >
                {/* Left: Logo + Name + Current Weight */}
                <div
                  className={cn(
                    "flex items-center gap-3",
                    isUntracked && "opacity-50"
                  )}
                >
                  <StockLogo
                    stockCode={stock.stock_code}
                    stockName={stock.stock_name}
                    currency={stock.currency}
                    size="default"
                  />
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {stock.stock_name}
                      {isUntracked && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (제외)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      현재 {stock.currentPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Right: Input or Locked */}
                <div className="flex items-center gap-3">
                  {isUntracked ? (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs px-3 py-2 bg-muted rounded-md">
                      <XCircle className="size-3.5" />
                      <span>편집 불가</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={stock.targetPct}
                        onChange={(e) =>
                          handleTargetPctChange(
                            stock.id,
                            e.target.value
                          )
                        }
                        className="w-20 text-right font-semibold text-foreground bg-transparent border-b-2 border-border focus:border-primary outline-none pb-1 transition-colors tabular-nums"
                      />
                      <span className="text-sm font-medium text-muted-foreground ml-1">
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Chart */}
        {chart && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50 h-full flex items-center">
            {chart}
          </div>
        )}
      </div>

      {/* Footer: Summary + Save */}
      <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-sm">
        <span
          className={cn(
            "text-muted-foreground flex items-center gap-2",
            !isValid && "text-destructive font-bold"
          )}
        >
          {!isValid ? (
            `비중 합계 초과: ${totalStockTargetPct.toFixed(0)}%`
          ) : (
            <>
              잔여 비중:{" "}
              <span className="font-bold text-foreground">
                {cashTargetPct.toFixed(1)}%
              </span>
            </>
          )}
        </span>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || !isValid || isSaving}
          className={cn(
            !hasChanges || !isValid
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : ""
          )}
        >
          {isSaving ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </section>
  );
}
