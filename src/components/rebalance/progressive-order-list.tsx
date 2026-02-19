"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { m } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";
import type { PendingOrder } from "@/hooks/use-progressive-rebalance";

interface ProgressiveOrderListProps {
  orders: ExecutionOrderResult[];
  side: "sell" | "buy";
  onQuantityChange: (stockCode: string, executedQuantity: number, actualPrice?: number) => void;
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
      className="h-9 px-3 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80"
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
  const [typingValue, setTypingValue] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevOrderQty, setPrevOrderQty] = useState(order.quantity);
  if (order.quantity !== prevOrderQty) {
    setPrevOrderQty(order.quantity);
    setTypingValue(null);
  }

  const serverQty = order.executed_quantity ?? 0;
  const displayValue = typingValue ?? String(pending?.quantity ?? serverQty);

  const executedQty = parseInt(displayValue, 10) || 0;
  const isFull = executedQty >= order.quantity;

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
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || executedQty <= 0}
        onClick={() => handleStep(-1)}
        className="flex items-center justify-center size-9 rounded-xl border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
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
        className="flex-1 h-9 rounded-xl text-right tabular-nums text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled || isFull}
        onClick={() => handleStep(1)}
        className="flex items-center justify-center size-9 rounded-xl border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
      >
        <Plus className="size-3.5" />
      </button>
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (execQty <= 0) return null;

  return (
    <Input
      type="number"
      placeholder={String(order.estimated_price)}
      value={localPrice}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-9 rounded-xl text-right tabular-nums text-sm w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

export function ProgressiveOrderList({
  orders,
  side,
  onQuantityChange,
  disabled = false,
  pendingOrders,
}: ProgressiveOrderListProps) {
  const filtered = orders
    .filter((o) => o.side === side)
    .sort((a, b) => b.estimated_amount - a.estimated_amount);

  const actualPriceRef = useRef<Map<string, number | undefined>>(new Map());

  function handlePriceChange(stockCode: string, price: number | undefined) {
    actualPriceRef.current.set(stockCode, price);
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

  if (filtered.length === 0) return null;

  const isSell = side === "sell";

  return (
    <div className="space-y-4">
      {filtered.map((order, i) => {
        const execQty = order.executed_quantity ?? 0;
        const isOverExecuted = order.over_executed === true;
        const isResolvedByRecalc = order.resolved_by_recalc === true;
        const isFull = execQty >= order.quantity;
        const isPartial = execQty > 0 && execQty < order.quantity;
        const executedAmount = execQty * (order.actual_price ?? order.estimated_price);

        const badge = isOverExecuted ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-600/30 dark:bg-yellow-900/30 dark:text-yellow-400">
            초과체결
          </span>
        ) : isResolvedByRecalc ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-600/30 dark:bg-blue-900/30 dark:text-blue-400">
            가격변동 해소
          </span>
        ) : isFull ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center">
            <Check className="size-3 mr-1" />
            완료
          </span>
        ) : isPartial ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center">
            <Minus className="size-3 mr-1" />
            일부
          </span>
        ) : isSell ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            매도
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            매수
          </span>
        );

        return (
          <m.div
            key={order.stock_code}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={cn(
              "rounded-3xl bg-card border border-border/50 shadow-sm p-5 transition-opacity",
              (isFull || isResolvedByRecalc) && "opacity-50",
              isResolvedByRecalc && "italic"
            )}
          >
            {/* Stock name row */}
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "text-base font-semibold",
                  isFull && "line-through"
                )}
              >
                {order.stock_name}
              </span>
              {badge}
            </div>

            {/* Order info */}
            <div className="text-sm text-muted-foreground tabular-nums mb-4">
              {order.quantity.toLocaleString("ko-KR")}주 &times;{" "}
              {formatCurrency(order.estimated_price)} ={" "}
              {formatCurrency(order.estimated_amount)}
            </div>

            {/* Input area */}
            {!isResolvedByRecalc && (
              <div className="space-y-3">
                {/* Quantity row */}
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1.5">체결 수량</div>
                  <div className="flex items-center gap-2">
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
                    <span className="text-xs text-muted-foreground shrink-0">
                      / {order.quantity.toLocaleString("ko-KR")}주
                    </span>
                  </div>
                </div>

                {/* Price row */}
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1.5">체결가</div>
                  <div className="flex items-center gap-2">
                    <ActualPriceInput
                      order={order}
                      onPriceChange={handlePriceChange}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground">
                      예상 {formatCurrency(order.estimated_price)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Partial info */}
            {isPartial && (
              <div className="text-xs text-muted-foreground mt-2 tabular-nums">
                체결: {execQty.toLocaleString("ko-KR")}주 = {formatCurrency(executedAmount)}
              </div>
            )}
          </m.div>
        );
      })}
    </div>
  );
}
