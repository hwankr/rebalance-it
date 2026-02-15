"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { m } from "framer-motion";
import { Check, Minus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";

interface ProgressiveOrderListProps {
  orders: ExecutionOrderResult[];
  side: "sell" | "buy";
  stepNumber: number;
  onQuantityChange: (stockCode: string, executedQuantity: number) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 500;

function DebouncedQuantityInput({
  order,
  onQuantityChange,
  disabled,
}: {
  order: ExecutionOrderResult;
  onQuantityChange: (stockCode: string, qty: number) => void;
  disabled: boolean;
}) {
  const [localValue, setLocalValue] = useState<string>(
    String(order.executed_quantity ?? 0)
  );
  const [prevExecutedQty, setPrevExecutedQty] = useState(order.executed_quantity);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with server data using React-recommended prop-change pattern
  if (order.executed_quantity !== prevExecutedQty) {
    setPrevExecutedQty(order.executed_quantity);
    setLocalValue(String(order.executed_quantity ?? 0));
  }

  const handleChange = useCallback(
    (rawValue: string) => {
      setLocalValue(rawValue);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const parsed = parseInt(rawValue, 10);
        const clamped = isNaN(parsed)
          ? 0
          : Math.max(0, Math.min(parsed, order.quantity));
        setLocalValue(String(clamped));
        onQuantityChange(order.stock_code, clamped);
      }, DEBOUNCE_MS);
    },
    [order.stock_code, order.quantity, onQuantityChange]
  );

  const handleBlur = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const parsed = parseInt(localValue, 10);
    const clamped = isNaN(parsed)
      ? 0
      : Math.max(0, Math.min(parsed, order.quantity));
    setLocalValue(String(clamped));
    onQuantityChange(order.stock_code, clamped);
  }, [localValue, order.stock_code, order.quantity, onQuantityChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const executedQty = parseInt(localValue, 10) || 0;
  const isFull = executedQty >= order.quantity;
  const isPartial = executedQty > 0 && executedQty < order.quantity;

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        max={order.quantity}
        step={1}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-20 h-8 text-right tabular-nums text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {isFull && (
        <Check className="size-4 text-green-600 dark:text-green-400 shrink-0" />
      )}
      {isPartial && (
        <Minus className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
      )}
    </div>
  );
}

export function ProgressiveOrderList({
  orders,
  side,
  stepNumber,
  onQuantityChange,
  disabled = false,
}: ProgressiveOrderListProps) {
  const filtered = orders.filter((o) => o.side === side);
  const completedCount = filtered.filter((o) => {
    if (o.executed_quantity !== undefined) return o.executed_quantity > 0;
    return o.executed === true;
  }).length;

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
            <span className="text-sm text-muted-foreground tabular-nums">
              {completedCount}/{filtered.length} 완료
            </span>
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
                  const isFull = execQty >= order.quantity;
                  const isPartial = execQty > 0 && execQty < order.quantity;
                  const executedAmount = execQty * order.estimated_price;

                  return (
                    <TableRow
                      key={order.stock_code}
                      className={cn(
                        "transition-colors duration-150",
                        isFull && "opacity-50"
                      )}
                    >
                      <TableCell
                        className={cn(
                          "font-medium",
                          isFull && "line-through"
                        )}
                      >
                        {order.stock_name}
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
                        <DebouncedQuantityInput
                          order={order}
                          onQuantityChange={onQuantityChange}
                          disabled={disabled}
                        />
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
          <div className="space-y-3 md:hidden">
            {filtered.map((order, i) => {
              const execQty = order.executed_quantity ?? 0;
              const isFull = execQty >= order.quantity;
              const isPartial = execQty > 0 && execQty < order.quantity;
              const executedAmount = execQty * order.estimated_price;

              return (
                <m.div
                  key={order.stock_code}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <div
                    className={cn(
                      "glass-card rounded-xl p-4 transition-opacity",
                      isFull && "opacity-50"
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
                          {isFull ? (
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
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground shrink-0">체결 수량</span>
                      <DebouncedQuantityInput
                        order={order}
                        onQuantityChange={onQuantityChange}
                        disabled={disabled}
                      />
                      <span className="text-xs text-muted-foreground">
                        / {order.quantity.toLocaleString("ko-KR")}주
                      </span>
                    </div>
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
