"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { m } from "framer-motion";
import { Check, Minus, CheckCheck, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";
import type { PendingOrder } from "@/hooks/use-progressive-rebalance";

interface ProgressiveOrderListProps {
  orders: ExecutionOrderResult[];
  side: "sell" | "buy";
  stepNumber: number;
  onQuantityChange: (stockCode: string, executedQuantity: number, actualPrice?: number) => void;
  onBatchFill?: () => void;
  disabled?: boolean;
  pendingOrders?: Map<string, PendingOrder>;
}

const DEBOUNCE_MS = 500;

function FillButton({
  order,
  onQuantityChange,
  disabled,
}: {
  order: ExecutionOrderResult;
  onQuantityChange: (stockCode: string, qty: number) => void;
  disabled: boolean;
}) {
  const isFull = (order.executed_quantity ?? 0) >= order.quantity;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || isFull}
      onClick={() => onQuantityChange(order.stock_code, order.quantity)}
      className="h-8 px-2 text-xs shrink-0"
    >
      전량
    </Button>
  );
}

function DebouncedQuantityInput({
  order,
  pending,
  onQuantityChange,
  disabled,
}: {
  order: ExecutionOrderResult;
  pending?: PendingOrder;
  onQuantityChange: (stockCode: string, qty: number) => void;
  disabled: boolean;
}) {
  // typingValue: local state ONLY for active text-input editing (immediate
  // visual feedback while debounce waits). Null when not typing.
  const [typingValue, setTypingValue] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear typing state when order.quantity changes (recalculate happened)
  const [prevOrderQty, setPrevOrderQty] = useState(order.quantity);
  if (order.quantity !== prevOrderQty) {
    setPrevOrderQty(order.quantity);
    setTypingValue(null);
  }

  // Display priority: typing > pending (hook-managed) > server prop
  const serverQty = order.executed_quantity ?? 0;
  const displayValue = typingValue ?? String(pending?.quantity ?? serverQty);

  const executedQty = parseInt(displayValue, 10) || 0;
  const isFull = executedQty >= order.quantity;
  const isPartial = executedQty > 0 && executedQty < order.quantity;

  const handleStep = useCallback(
    (delta: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setTypingValue(null);
      const current = pending?.quantity ?? (order.executed_quantity ?? 0);
      const next = Math.max(0, Math.min(current + delta, order.quantity));
      onQuantityChange(order.stock_code, next);
    },
    [pending, order.executed_quantity, order.stock_code, order.quantity, onQuantityChange],
  );

  const handleChange = useCallback(
    (rawValue: string) => {
      setTypingValue(rawValue);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const parsed = parseInt(rawValue, 10);
        const clamped = isNaN(parsed)
          ? 0
          : Math.max(0, Math.min(parsed, order.quantity));
        setTypingValue(null);
        onQuantityChange(order.stock_code, clamped);
      }, DEBOUNCE_MS);
    },
    [order.stock_code, order.quantity, onQuantityChange],
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const parsed = parseInt(displayValue, 10);
    const clamped = isNaN(parsed)
      ? 0
      : Math.max(0, Math.min(parsed, order.quantity));
    setTypingValue(null);
    onQuantityChange(order.stock_code, clamped);
  }, [displayValue, order.stock_code, order.quantity, onQuantityChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* -1 stepper (desktop only) */}
      <button
        type="button"
        disabled={disabled || executedQty <= 0}
        onClick={() => handleStep(-1)}
        className="hidden md:flex items-center justify-center size-8 rounded-md border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none shrink-0"
      >
        <Minus className="size-3.5" />
      </button>
      <Input
        type="number"
        min={0}
        max={order.quantity}
        step={1}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-full md:w-20 h-8 text-right tabular-nums text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {/* +1 stepper (desktop only) */}
      <button
        type="button"
        disabled={disabled || executedQty >= order.quantity}
        onClick={() => handleStep(1)}
        className="hidden md:flex items-center justify-center size-8 rounded-md border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none shrink-0"
      >
        <Plus className="size-3.5" />
      </button>
      {isFull && (
        <Check className="size-4 text-green-600 dark:text-green-400 shrink-0" />
      )}
      {isPartial && (
        <Minus className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
      )}
    </div>
  );
}

function ActualPriceInput({
  order,
  onPriceChange,
  disabled,
}: {
  order: ExecutionOrderResult;
  onPriceChange: (stockCode: string, price: number | undefined) => void;
  disabled: boolean;
}) {
  const execQty = order.executed_quantity ?? 0;
  const [localPrice, setLocalPrice] = useState<string>(
    order.actual_price != null ? String(order.actual_price) : ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server
  const [prevActualPrice, setPrevActualPrice] = useState(order.actual_price);
  if (order.actual_price !== prevActualPrice) {
    setPrevActualPrice(order.actual_price);
    setLocalPrice(order.actual_price != null ? String(order.actual_price) : "");
  }

  const handleChange = useCallback((rawValue: string) => {
    setLocalPrice(rawValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed) && parsed > 0) {
        onPriceChange(order.stock_code, parsed);
      } else if (rawValue === "" || rawValue === "0") {
        onPriceChange(order.stock_code, undefined);
      }
    }, 500);
  }, [order.stock_code, onPriceChange]);

  const handleBlur = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const parsed = parseFloat(localPrice);
    if (!isNaN(parsed) && parsed > 0) {
      onPriceChange(order.stock_code, parsed);
    }
  }, [localPrice, order.stock_code, onPriceChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Only show when executed_quantity > 0
  if (execQty <= 0) return null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
      >
        체결가 입력
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        placeholder={String(order.estimated_price)}
        value={localPrice}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-24 h-7 text-right tabular-nums text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

export function ProgressiveOrderList({
  orders,
  side,
  stepNumber,
  onQuantityChange,
  onBatchFill,
  disabled = false,
  pendingOrders,
}: ProgressiveOrderListProps) {
  const filtered = orders
    .filter((o) => o.side === side)
    .sort((a, b) => b.estimated_amount - a.estimated_amount);

  // Track actual prices per order
  const actualPriceRef = useRef<Map<string, number | undefined>>(new Map());

  function handlePriceChange(stockCode: string, price: number | undefined) {
    actualPriceRef.current.set(stockCode, price);
    // Re-send the current executed_quantity with the new price
    const order = filtered.find((o) => o.stock_code === stockCode);
    if (order) {
      const execQty = order.executed_quantity ?? 0;
      if (execQty > 0) {
        onQuantityChange(stockCode, execQty, price);
      }
    }
  }

  function handleQuantityWithPrice(stockCode: string, qty: number) {
    const storedPrice = actualPriceRef.current.get(stockCode);
    onQuantityChange(stockCode, qty, storedPrice);
  }

  const completedCount = filtered.filter((o) => {
    if (o.resolved_by_recalc) return false;
    if (o.over_executed) return true;
    if (o.executed_quantity !== undefined) return o.executed_quantity >= o.quantity;
    return o.executed === true;
  }).length;
  const activeOrders = filtered.filter((o) => !o.resolved_by_recalc);
  const allFilled = completedCount === activeOrders.length;

  if (filtered.length === 0) return null;

  const isSell = side === "sell";
  const badgeColor = isSell
    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
    : "bg-green-500/10 text-green-600 hover:bg-green-500/20";
  const title = isSell ? "매도할 종목" : "매수할 종목";
  const description = isSell
    ? "현금을 확보하기 위해 아래 종목을 먼저 매도하세요."
    : "매도 완료 후 아래 종목을 매수하세요.";

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: stepNumber * 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={badgeColor}>{stepNumber}단계</Badge>
              <CardTitle>{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {completedCount}/{filtered.length} 완료
              </span>
              {onBatchFill && !disabled && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={allFilled}
                  onClick={onBatchFill}
                  className="h-7 text-xs gap-1"
                >
                  <CheckCheck className="size-3.5" />
                  전체 체결
                </Button>
              )}
            </div>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목명</TableHead>
                  <TableHead className="text-right">주문 수량</TableHead>
                  <TableHead className="text-right">체결 수량</TableHead>
                  <TableHead className="text-right">예상 가격</TableHead>
                  <TableHead className="text-right">예상 금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const execQty = order.executed_quantity ?? 0;
                  const isOverExecuted = order.over_executed === true;
                  const isResolvedByRecalc = order.resolved_by_recalc === true;
                  const isFull = execQty >= order.quantity;
                  const isPartial = execQty > 0 && execQty < order.quantity;
                  const executedAmount = execQty * (order.actual_price ?? order.estimated_price);

                  return (
                    <TableRow
                      key={order.stock_code}
                      className={cn(
                        "transition-colors duration-150",
                        (isFull || isResolvedByRecalc) && "opacity-50",
                        isResolvedByRecalc && "italic"
                      )}
                    >
                      <TableCell
                        className={cn(
                          "font-medium",
                          isFull && "line-through"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {order.stock_name}
                          {isOverExecuted && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 text-xs">
                              초과체결
                            </Badge>
                          )}
                          {isResolvedByRecalc && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600/30 text-xs">
                              가격변동 해소
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          isFull && "line-through"
                        )}
                      >
                        {order.quantity.toLocaleString("ko-KR")}주
                      </TableCell>
                      <TableCell className="text-right">
                        {!isResolvedByRecalc ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1">
                              <DebouncedQuantityInput
                                order={order}
                                pending={pendingOrders?.get(order.stock_code)}
                                onQuantityChange={handleQuantityWithPrice}
                                disabled={disabled || isOverExecuted}
                              />
                              {!isOverExecuted && (
                                <FillButton
                                  order={order}
                                  onQuantityChange={handleQuantityWithPrice}
                                  disabled={disabled}
                                />
                              )}
                            </div>
                            <ActualPriceInput
                              order={order}
                              onPriceChange={handlePriceChange}
                              disabled={disabled}
                            />
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">-</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(order.estimated_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <div>{formatCurrency(order.estimated_amount)}</div>
                        {isPartial && (
                          <div className="text-xs text-muted-foreground">
                            체결: {formatCurrency(executedAmount)}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-4 md:hidden">
            {filtered.map((order, i) => {
              const execQty = order.executed_quantity ?? 0;
              const isOverExecuted = order.over_executed === true;
              const isResolvedByRecalc = order.resolved_by_recalc === true;
              const isFull = execQty >= order.quantity;
              const isPartial = execQty > 0 && execQty < order.quantity;
              const executedAmount = execQty * (order.actual_price ?? order.estimated_price);

              return (
                <m.div
                  key={order.stock_code}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <div
                    className={cn(
                      "rounded-xl border bg-card p-4 transition-opacity",
                      (isFull || isResolvedByRecalc) && "opacity-50",
                      isResolvedByRecalc && "italic"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "font-semibold",
                              isFull && "line-through"
                            )}
                          >
                            {order.stock_name}
                          </span>
                          {isOverExecuted ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-600/30"
                            >
                              초과체결
                            </Badge>
                          ) : isResolvedByRecalc ? (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-600/30"
                            >
                              가격변동 해소
                            </Badge>
                          ) : isFull ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600/30"
                            >
                              <Check className="size-3 mr-1" />
                              완료
                            </Badge>
                          ) : isPartial ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-600/30"
                            >
                              <Minus className="size-3 mr-1" />
                              일부
                            </Badge>
                          ) : (
                            <Badge className={badgeColor}>
                              {isSell ? "매도" : "매수"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground tabular-nums">
                          주문: {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                          {formatCurrency(order.estimated_price)} ={" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(order.estimated_amount)}
                          </span>
                        </div>
                        {isPartial && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            체결: {execQty.toLocaleString("ko-KR")}주 = {formatCurrency(executedAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isResolvedByRecalc && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">체결 수량</span>
                          <DebouncedQuantityInput
                            order={order}
                            pending={pendingOrders?.get(order.stock_code)}
                            onQuantityChange={handleQuantityWithPrice}
                            disabled={disabled || isOverExecuted}
                          />
                          <span className="text-xs text-muted-foreground">
                            / {order.quantity.toLocaleString("ko-KR")}주
                          </span>
                          {!isOverExecuted && (
                            <FillButton
                              order={order}
                              onQuantityChange={handleQuantityWithPrice}
                              disabled={disabled}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ActualPriceInput
                            order={order}
                            onPriceChange={handlePriceChange}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
