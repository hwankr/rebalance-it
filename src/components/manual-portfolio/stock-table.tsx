"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";

interface StockRow {
  id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  price_updated_at: string | null;
  currency: string;
  updated_at: string;
}

interface StockTableProps {
  stocks: StockRow[];
  onUpdate: (id: string, updates: Partial<ManualStockInput>) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  exchangeRate?: number;
}

function getPriceFreshnessClass(priceUpdatedAt: string | null): string {
  if (!priceUpdatedAt) return "text-muted-foreground";
  const diffMs = Date.now() - new Date(priceUpdatedAt).getTime();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  if (diffMs < oneHour) return "text-muted-foreground";
  if (diffMs < oneDay) return "text-muted-foreground";
  return "text-yellow-600";
}

function formatPriceTimestamp(priceUpdatedAt: string | null): string {
  if (!priceUpdatedAt) return "수동 입력";
  return formatDistanceToNow(new Date(priceUpdatedAt), {
    addSuffix: true,
    locale: ko,
  });
}

function formatUsdPrice(price: number): string {
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StockTable({
  stocks,
  onUpdate,
  onDelete,
  onRefresh,
  isRefreshing,
  exchangeRate,
}: StockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ManualStockInput>>({});

  function startEdit(stock: StockRow) {
    setEditingId(stock.id);
    setEditValues({
      quantity: stock.quantity,
      avg_price: stock.avg_price,
      current_price: stock.current_price,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function saveEdit(id: string) {
    onUpdate(id, editValues);
    setEditingId(null);
    setEditValues({});
  }

  if (stocks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        종목이 없습니다. 위 폼에서 종목을 추가해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onRefresh && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            가격 새로고침
          </Button>
        </div>
      )}

      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목코드</TableHead>
            <TableHead>종목명</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">평균매입가</TableHead>
            <TableHead className="text-right">현재가</TableHead>
            <TableHead className="text-right">평가금액</TableHead>
            <TableHead className="text-right">손익</TableHead>
            <TableHead className="text-right">수익률</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock, index) => {
            const isEditing = editingId === stock.id;
            const isUsd = stock.currency === "USD";
            const evalAmount = stock.current_price * stock.quantity;
            const profitLoss =
              (stock.current_price - stock.avg_price) * stock.quantity;
            const profitRate =
              stock.avg_price > 0
                ? ((stock.current_price - stock.avg_price) / stock.avg_price) *
                  100
                : 0;

            // For USD stocks, compute KRW equivalents for display
            const evalAmountKrw =
              isUsd && exchangeRate ? evalAmount * exchangeRate : evalAmount;
            const profitLossKrw =
              isUsd && exchangeRate ? profitLoss * exchangeRate : profitLoss;

            return (
              <TableRow key={stock.id ?? `stock-${index}`}>
                <TableCell className="font-mono text-sm">
                  {stock.stock_code}
                </TableCell>
                <TableCell>{stock.stock_name}</TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-20 text-right"
                      value={editValues.quantity ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          quantity: Number(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    stock.quantity.toLocaleString()
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editValues.avg_price ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          avg_price: Number(e.target.value),
                        }))
                      }
                    />
                  ) : isUsd ? (
                    formatUsdPrice(stock.avg_price)
                  ) : (
                    formatCurrency(stock.avg_price)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editValues.current_price ?? ""}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          current_price: Number(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    <div>
                      <div>
                        {isUsd
                          ? formatUsdPrice(stock.current_price)
                          : formatCurrency(stock.current_price)}
                      </div>
                      {isUsd && exchangeRate && (
                        <div className="text-xs text-muted-foreground">
                          ({formatCurrency(
                            Math.round(stock.current_price * exchangeRate)
                          )})
                        </div>
                      )}
                      <div
                        className={`text-xs ${getPriceFreshnessClass(stock.price_updated_at)}`}
                      >
                        {formatPriceTimestamp(stock.price_updated_at)}
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isUsd && exchangeRate
                    ? formatCurrency(Math.round(evalAmountKrw))
                    : formatCurrency(evalAmount)}
                </TableCell>
                <TableCell
                  className={`text-right ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {profitLoss >= 0 ? "+" : ""}
                  {isUsd && exchangeRate
                    ? formatCurrency(Math.round(profitLossKrw))
                    : formatCurrency(profitLoss)}
                </TableCell>
                <TableCell
                  className={`text-right ${profitRate >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {profitRate >= 0 ? "+" : ""}
                  {formatPercent(profitRate)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => saveEdit(stock.id)}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={cancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(stock)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive"
                          onClick={() => onDelete(stock.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {stocks.map((stock, i) => {
          const isEditing = editingId === stock.id;
          const isUsd = stock.currency === "USD";
          const evalAmount = stock.current_price * stock.quantity;
          const profitLoss = (stock.current_price - stock.avg_price) * stock.quantity;
          const profitRate = stock.avg_price > 0 ? ((stock.current_price - stock.avg_price) / stock.avg_price) * 100 : 0;

          const evalAmountKrw = isUsd && exchangeRate ? evalAmount * exchangeRate : evalAmount;
          const profitLossKrw = isUsd && exchangeRate ? profitLoss * exchangeRate : profitLoss;

          return (
            <m.div
              key={stock.id ?? `stock-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="glass-card card-hover rounded-xl p-4">
                {isEditing ? (
                  // Edit mode: stacked inputs
                  <div className="space-y-3">
                    <div className="font-semibold mb-2">{stock.stock_name}</div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">수량</label>
                      <Input
                        type="number"
                        className="w-full"
                        value={editValues.quantity ?? ""}
                        onChange={(e) => setEditValues((v) => ({ ...v, quantity: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">평균가</label>
                      <Input
                        type="number"
                        className="w-full"
                        value={editValues.avg_price ?? ""}
                        onChange={(e) => setEditValues((v) => ({ ...v, avg_price: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">현재가</label>
                      <Input
                        type="number"
                        className="w-full"
                        value={editValues.current_price ?? ""}
                        onChange={(e) => setEditValues((v) => ({ ...v, current_price: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => saveEdit(stock.id)}
                      >
                        <Check className="size-4 mr-2" />
                        저장
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={cancelEdit}
                      >
                        <X className="size-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode: card content
                  <>
                    {/* Top row: stock name + action buttons */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="font-semibold">{stock.stock_name}</div>
                        <div className="text-xs text-muted-foreground tabular-nums flex items-center gap-2 mt-0.5">
                          {stock.stock_code}
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {stock.currency}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(stock)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive"
                          onClick={() => onDelete(stock.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Middle row: 3 key values */}
                    <div className="grid grid-cols-3 gap-2 my-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">현재가</div>
                        <div className="font-medium tabular-nums text-sm">
                          {isUsd ? formatUsdPrice(stock.current_price) : formatCurrency(stock.current_price)}
                        </div>
                        {isUsd && exchangeRate && (
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            ({formatCurrency(Math.round(stock.current_price * exchangeRate))})
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">평가금액</div>
                        <div className="font-medium tabular-nums text-sm">
                          {isUsd && exchangeRate ? formatCurrency(Math.round(evalAmountKrw)) : formatCurrency(evalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">손익</div>
                        <div className={cn("font-medium tabular-nums text-sm", profitLoss >= 0 ? "text-green-600" : "text-red-600")}>
                          {profitLoss >= 0 ? "+" : ""}
                          {isUsd && exchangeRate ? formatCurrency(Math.round(profitLossKrw)) : formatCurrency(profitLoss)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: secondary info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="tabular-nums">
                        수량 {stock.quantity.toLocaleString()} · 평균 {isUsd ? formatUsdPrice(stock.avg_price) : formatCurrency(stock.avg_price)} ·
                        <span className={cn("ml-1", profitRate >= 0 ? "text-green-600" : "text-red-600")}>
                          {profitRate >= 0 ? "+" : ""}{formatPercent(profitRate)}
                        </span>
                      </div>
                      <div className={getPriceFreshnessClass(stock.price_updated_at)}>
                        {formatPriceTimestamp(stock.price_updated_at)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
