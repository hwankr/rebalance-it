"use client";

import { useState, useMemo } from "react";
import { Pencil } from "lucide-react";
import { m } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/stock-logo";
import { WeightBulletChart } from "@/components/portfolio/weight-bullet-chart";

interface TargetWeightEditorProps {
  stocks: Array<{
    id: string;
    stock_code: string;
    stock_name: string;
    quantity: number;
    current_price: number;
    currency: string;
    target_pct: number;
  }>;
  cashAmount: number;
  exchangeRate: number;
  onSave: (updates: { id: string; targetPct: number }[]) => void;
  isSaving: boolean;
  /** "always-edit": 항상 입력 모드 (기존 동작). "inline": 읽기전용 → 편집 토글. */
  mode?: "always-edit" | "inline";
}

export function TargetWeightEditor({
  stocks,
  cashAmount,
  exchangeRate,
  onSave,
  isSaving,
  mode = "always-edit",
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
    return stocks.reduce(
      (sum, s) => sum + (edits[s.id] ?? s.target_pct ?? 0),
      0
    );
  }, [stocks, edits]);

  const cashTargetPct = Math.max(0, 100 - totalStockTargetPct);
  const cashDiff = cashTargetPct - cashCurrentPct;
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
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold">목표 비중</h3>
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
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 py-6 px-4">
            <p className="text-sm text-muted-foreground text-center">
              목표 비중을 설정하면 현재 포트폴리오와 비교하여 리밸런싱을 실행할 수 있습니다.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Inline 모드: 읽기전용 뷰 ──
  if (mode === "inline" && !isEditing) {
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold">현재 vs 목표 비중</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleStartEditing}
          >
            <Pencil className="size-3.5" />
            편집
          </Button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border rounded-xl overflow-visible">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[45%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground text-xs border-b border-border/50">
                <th className="text-left py-3 px-4 font-medium">종목</th>
                <th className="text-center py-3 px-4 font-medium">현재 vs 목표</th>
                <th className="text-right py-3 px-4 font-medium">차이</th>
              </tr>
            </thead>
            <tbody>
              {/* 현금 행 (상단) */}
              <tr className="bg-muted/20">
                <td className="py-3 px-4 font-medium text-muted-foreground">
                  현금
                </td>
                <td className="py-3 px-4">
                  <WeightBulletChart
                    currentPct={cashCurrentPct}
                    targetPct={cashTargetPct}
                  />
                </td>
                <td className="text-right px-4">
                  {Math.abs(cashDiff) >= 0.05 && (
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    )}>
                      {Math.abs(cashDiff) < 0.05 ? "=" : cashDiff > 0 ? "▼" : "▲"} {cashDiff > 0 ? "+" : ""}{cashDiff.toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
              {stocksWithPcts
                .filter((d) => d.targetPct > 0 || d.currentPct > 0.1)
                .map((d) => {
                  const diff = d.currentPct - d.targetPct;
                  const absDiff = Math.abs(diff);
                  const arrow = absDiff < 0.05 ? "=" : diff > 0 ? "▲" : "▼";
                  // 1주 이상 차이 계산
                  const sharePrice = d.currency === "USD" ? d.current_price * exchangeRate : d.current_price;
                  const driftAmount = totalValue * absDiff / 100;
                  const isSignificant = sharePrice > 0 && driftAmount / sharePrice >= 1;
                  const diffColor = isSignificant
                    ? "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-800/40"
                    : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30";
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <StockLogo stockCode={d.stock_code} stockName={d.stock_name} currency={d.currency} size="sm" />
                          <div>
                            <div className="font-medium">{d.stock_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.stock_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <WeightBulletChart
                          currentPct={d.currentPct}
                          targetPct={d.targetPct}
                        />
                      </td>
                      <td className="text-right px-4">
                        {absDiff >= 0.05 && (
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", diffColor)}>
                            {arrow} {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="space-y-0.5 md:hidden text-sm">
          {/* 현금 (상단) */}
          <div className="py-2.5 px-2 bg-muted/20 rounded-lg mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-medium text-muted-foreground">현금</div>
              {Math.abs(cashDiff) >= 0.05 && (
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                  "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                )}>
                  {Math.abs(cashDiff) < 0.05 ? "=" : cashDiff > 0 ? "▼" : "▲"} {cashDiff > 0 ? "+" : ""}{cashDiff.toFixed(1)}%
                </span>
              )}
            </div>
            <WeightBulletChart
              currentPct={cashCurrentPct}
              targetPct={cashTargetPct}
              compact
            />
          </div>
          {stocksWithPcts
            .filter((d) => d.targetPct > 0 || d.currentPct > 0.1)
            .map((d) => {
              const diff = d.currentPct - d.targetPct;
              const absDiff = Math.abs(diff);
              const arrow = absDiff < 0.05 ? "=" : diff > 0 ? "▲" : "▼";
              const sharePrice = d.currency === "USD" ? d.current_price * exchangeRate : d.current_price;
              const driftAmount = totalValue * absDiff / 100;
              const isSignificant = sharePrice > 0 && driftAmount / sharePrice >= 1;
              const diffColor = isSignificant
                ? "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-800/40"
                : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30";
              return (
                <div
                  key={d.id}
                  className="py-2.5 px-2 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-medium truncate flex-1 pr-2">
                      <StockLogo stockCode={d.stock_code} stockName={d.stock_name} currency={d.currency} size="sm" />
                      {d.stock_name}
                    </div>
                    {absDiff >= 0.05 && (
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums", diffColor)}>
                        {arrow} {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <WeightBulletChart
                    currentPct={d.currentPct}
                    targetPct={d.targetPct}
                    compact
                  />
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // ── 편집 모드 (always-edit 또는 inline 편집 중) ──
  return (
    <div className="space-y-4">
      {/* Inline 모드 편집 헤더 */}
      {mode === "inline" && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold">목표 비중 편집</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={!hasChanges || !isValid || isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>종목명</TableHead>
              <TableHead className="text-right">현재 평가금액</TableHead>
              <TableHead className="text-right">현재 비중(%)</TableHead>
              <TableHead className="text-right">목표 비중(%)</TableHead>
              <TableHead className="text-right">차이</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocksWithPcts.map((stock) => {
              const isModified = modifiedStocks.has(stock.id);
              const diff = stock.targetPct - stock.currentPct;

              return (
                <TableRow key={stock.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{stock.stock_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {stock.stock_code}
                        </div>
                      </div>
                      {isModified && (
                        <Badge variant="secondary" className="text-xs">
                          수정됨
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(stock.evalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.currentPct.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={stock.targetPct}
                      onChange={(e) =>
                        handleTargetPctChange(stock.id, e.target.value)
                      }
                      className="w-24 text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        diff > 0 && "text-blue-600",
                        diff < 0 && "text-red-600"
                      )}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(2)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Cash Row */}
            <TableRow className="bg-muted/50">
              <TableCell>
                <div className="font-medium">현금</div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(cashAmount)}
              </TableCell>
              <TableCell className="text-right">
                {cashCurrentPct.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right">
                <div className="text-sm text-muted-foreground">
                  (나머지) {cashTargetPct.toFixed(2)}%
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    cashDiff > 0 && "text-blue-600",
                    cashDiff < 0 && "text-red-600"
                  )}
                >
                  {cashDiff > 0 ? "+" : ""}
                  {cashDiff.toFixed(2)}%
                </span>
              </TableCell>
            </TableRow>

            {/* Summary Row */}
            <TableRow className="border-t-2">
              <TableCell colSpan={2} className="font-semibold">
                합계
              </TableCell>
              <TableCell className="text-right font-semibold">
                100.00%
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "font-semibold",
                    !isValid && "text-destructive"
                  )}
                >
                  {(totalStockTargetPct + cashTargetPct).toFixed(2)}%
                </span>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {stocksWithPcts.map((stock, index) => {
          const isModified = modifiedStocks.has(stock.id);
          const diff = stock.targetPct - stock.currentPct;

          return (
            <m.div
              key={stock.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{stock.stock_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {stock.stock_code}
                    </div>
                  </div>
                  {isModified && (
                    <Badge variant="secondary" className="text-xs">
                      수정됨
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">현재 평가금액</div>
                    <div className="font-medium">
                      {formatCurrency(stock.evalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">현재 비중</div>
                    <div className="font-medium">
                      {stock.currentPct.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    목표 비중(%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={stock.targetPct}
                    onChange={(e) =>
                      handleTargetPctChange(stock.id, e.target.value)
                    }
                    className="text-right"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">차이</div>
                  <div
                    className={cn(
                      "font-medium",
                      diff > 0 && "text-blue-600",
                      diff < 0 && "text-red-600"
                    )}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(2)}%
                  </div>
                </div>
              </Card>
            </m.div>
          );
        })}

        {/* Cash Card */}
        <Card className="p-4 space-y-3 bg-muted/50">
          <div className="font-medium">현금</div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">현재 평가금액</div>
              <div className="font-medium">
                {formatCurrency(cashAmount)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">현재 비중</div>
              <div className="font-medium">
                {cashCurrentPct.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              목표 비중(%)
            </label>
            <div className="text-sm text-muted-foreground text-right">
              (나머지) {cashTargetPct.toFixed(2)}%
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">차이</div>
            <div
              className={cn(
                "font-medium",
                cashDiff > 0 && "text-blue-600",
                cashDiff < 0 && "text-red-600"
              )}
            >
              {cashDiff > 0 ? "+" : ""}
              {cashDiff.toFixed(2)}%
            </div>
          </div>
        </Card>

        {/* Summary Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">합계</div>
            <div
              className={cn(
                "font-semibold",
                !isValid && "text-destructive"
              )}
            >
              {(totalStockTargetPct + cashTargetPct).toFixed(2)}%
            </div>
          </div>
        </Card>
      </div>

      {/* Validation & Save (always-edit 모드에서만) */}
      {mode === "always-edit" && (
        <div className="flex flex-col gap-3">
          {!isValid && (
            <div className="text-sm text-destructive">
              목표 비중 합계가 100%를 초과할 수 없습니다.
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasChanges
                ? `${modifiedStocks.size}개 종목 수정됨`
                : "변경 사항 없음"}
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValid || isSaving}
            >
              {isSaving ? "저장 중..." : "목표 비중 저장"}
            </Button>
          </div>
        </div>
      )}

      {/* Inline 모드 유효성 에러 */}
      {mode === "inline" && !isValid && (
        <div className="text-sm text-destructive px-1">
          목표 비중 합계가 100%를 초과할 수 없습니다.
        </div>
      )}
    </div>
  );
}
