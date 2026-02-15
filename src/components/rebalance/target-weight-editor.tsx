"use client";

import { useState, useMemo } from "react";
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
}

export function TargetWeightEditor({
  stocks,
  cashAmount,
  exchangeRate,
  onSave,
  isSaving,
}: TargetWeightEditorProps) {
  // Only store user edits (overrides). Unedited stocks use prop values.
  const [edits, setEdits] = useState<Record<string, number>>({});

  // Track which stocks have been modified
  const modifiedStocks = useMemo(() => {
    return new Set(
      stocks
        .filter((s) => s.id in edits && edits[s.id] !== (s.target_pct ?? 0))
        .map((s) => s.id)
    );
  }, [stocks, edits]);

  // Calculate evaluation amounts and percentages
  const stockData = useMemo(() => {
    return stocks.map((stock) => {
      const evalAmount =
        stock.currency === "USD"
          ? stock.current_price * exchangeRate * stock.quantity
          : stock.current_price * stock.quantity;

      return {
        ...stock,
        evalAmount,
      };
    });
  }, [stocks, exchangeRate]);

  const totalValue = useMemo(() => {
    const stockTotal = stockData.reduce((sum, s) => sum + s.evalAmount, 0);
    return stockTotal + cashAmount;
  }, [stockData, cashAmount]);

  const stocksWithPcts = useMemo(() => {
    return stockData.map((stock) => ({
      ...stock,
      currentPct: (stock.evalAmount / totalValue) * 100,
      targetPct: edits[stock.id] ?? stock.target_pct ?? 0,
    }));
  }, [stockData, totalValue, edits]);

  const cashCurrentPct = (cashAmount / totalValue) * 100;

  // Calculate cash target percentage (auto-calculated)
  const totalStockTargetPct = useMemo(() => {
    return stocks.reduce(
      (sum, s) => sum + (edits[s.id] ?? s.target_pct ?? 0),
      0
    );
  }, [stocks, edits]);

  const cashTargetPct = 100 - totalStockTargetPct;

  const isValid = totalStockTargetPct <= 100;
  const hasChanges = modifiedStocks.size > 0;

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
  };

  return (
    <div className="space-y-4">
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
                    cashTargetPct - cashCurrentPct > 0 && "text-blue-600",
                    cashTargetPct - cashCurrentPct < 0 && "text-red-600"
                  )}
                >
                  {cashTargetPct - cashCurrentPct > 0 ? "+" : ""}
                  {(cashTargetPct - cashCurrentPct).toFixed(2)}%
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
                cashTargetPct - cashCurrentPct > 0 && "text-blue-600",
                cashTargetPct - cashCurrentPct < 0 && "text-red-600"
              )}
            >
              {cashTargetPct - cashCurrentPct > 0 ? "+" : ""}
              {(cashTargetPct - cashCurrentPct).toFixed(2)}%
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

      {/* Validation & Save */}
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
    </div>
  );
}
