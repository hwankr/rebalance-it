"use client";

import { Check, Minus, Circle, Clock } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  RebalanceExecution,
  ExecutionOrderResult,
} from "@/lib/rebalance/history-types";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "secondary" | "destructive" | "default" | "outline" }
> = {
  completed: { label: "완료", variant: "success" },
  partial: { label: "부분 완료", variant: "secondary" },
  failed: { label: "실패", variant: "destructive" },
  in_progress: { label: "진행중", variant: "default" },
  abandoned: { label: "포기", variant: "outline" },
};

interface HistoryDetailSheetProps {
  execution: RebalanceExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getExecQty(order: ExecutionOrderResult): number {
  return order.executed_quantity ?? 0;
}

function OrderStatusIcon({ order }: { order: ExecutionOrderResult }) {
  if (order.resolved_by_recalc) {
    return <Minus className="size-4 text-muted-foreground/50 shrink-0" />;
  }
  const qty = getExecQty(order);
  if (order.over_executed || qty >= order.quantity) {
    return <Check className="size-4 text-green-600 dark:text-green-400 shrink-0" />;
  }
  if (qty > 0) {
    return <Minus className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />;
  }
  return <Circle className="size-4 text-muted-foreground shrink-0" />;
}

function OrderRow({ order }: { order: ExecutionOrderResult }) {
  const qty = getExecQty(order);
  const isResolved = order.resolved_by_recalc;
  const isFull = !isResolved && (order.over_executed || qty >= order.quantity);
  const isPartial = !isResolved && !isFull && qty > 0;
  const actualPrice = order.actual_price ?? order.estimated_price;

  return (
    <div
      className={cn(
        "py-2 px-2.5 rounded-xl space-y-0.5",
        isResolved && "opacity-50",
        !isResolved && qty === 0 && "bg-orange-50/50 dark:bg-orange-950/20"
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <OrderStatusIcon order={order} />
        <span className={cn("flex-1 truncate", isResolved && "line-through italic")}>
          {order.stock_name}
        </span>
        {isResolved && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">재계산 제외</span>
        )}
        {order.over_executed && (
          <span className="text-[10px] text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded font-medium">초과체결</span>
        )}
      </div>
      {/* Planned */}
      <div className="text-xs text-muted-foreground ml-6 tabular-nums">
        계획: {order.quantity}주 × {formatCurrency(order.estimated_price)} = {formatCurrency(order.estimated_amount)}
      </div>
      {/* Actual (only if executed) */}
      {qty > 0 && !isResolved && (
        <div className={cn(
          "text-xs ml-6 tabular-nums font-medium",
          isFull ? "text-green-600 dark:text-green-400" : isPartial ? "text-yellow-600 dark:text-yellow-400" : ""
        )}>
          실제: {qty}주 × {formatCurrency(actualPrice)} = {formatCurrency(qty * actualPrice)}
        </div>
      )}
      {qty === 0 && !isResolved && (
        <div className="text-xs ml-6 text-muted-foreground">미체결</div>
      )}
    </div>
  );
}

export function HistoryDetailSheet({
  execution,
  open,
  onOpenChange,
}: HistoryDetailSheetProps) {
  if (!execution) return null;

  const statusInfo = STATUS_MAP[execution.status] ?? STATUS_MAP.completed;
  const allOrders = execution.orders ?? [];
  const activeOrders = allOrders.filter((o) => !o.resolved_by_recalc);
  const resolvedOrders = allOrders.filter((o) => o.resolved_by_recalc);
  const sellOrders = activeOrders.filter((o) => o.side === "sell");
  const buyOrders = activeOrders.filter((o) => o.side === "buy");
  const resolvedSells = resolvedOrders.filter((o) => o.side === "sell");
  const resolvedBuys = resolvedOrders.filter((o) => o.side === "buy");

  const filledOrders = activeOrders.filter(
    (o) => o.over_executed || getExecQty(o) >= o.quantity,
  ).length;

  // Duration
  const startedAt = execution.started_at ? new Date(execution.started_at) : null;
  const completedAt = execution.completed_at ? new Date(execution.completed_at) : null;
  const duration =
    startedAt && completedAt
      ? formatDistance(startedAt, completedAt, { locale: ko })
      : null;

  const snapshot = execution.portfolio_snapshot;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="flex-1 truncate">
              {execution.preset_name ?? execution.profile_name}
            </SheetTitle>
            <Badge variant={statusInfo.variant} className="shrink-0">
              {statusInfo.label}
            </Badge>
          </div>
          <SheetDescription>리밸런싱 실행 상세 기록</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              실행: {format(new Date(execution.executed_at), "yyyy.MM.dd HH:mm")}
            </span>
            {startedAt && (
              <span>시작: {format(startedAt, "yyyy.MM.dd HH:mm")}</span>
            )}
            {completedAt && (
              <span>종료: {format(completedAt, "yyyy.MM.dd HH:mm")}</span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                소요: {duration}
              </span>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">전체 주문</div>
              <div className="text-lg font-bold tabular-nums">{activeOrders.length}건</div>
              <div className="text-xs text-muted-foreground">
                매도 {sellOrders.length} · 매수 {buyOrders.length}
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">체결</div>
              <div className={cn(
                "text-lg font-bold tabular-nums",
                filledOrders < activeOrders.length
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-green-600 dark:text-green-400"
              )}>
                {filledOrders}건
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">미체결</div>
              <div className={cn(
                "text-lg font-bold tabular-nums",
                activeOrders.length - filledOrders > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}>
                {activeOrders.length - filledOrders}건
              </div>
            </div>
          </div>

          {/* Amount summary */}
          <div className="rounded-2xl border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">총 매도</span>
              <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(execution.total_sell_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">총 매수</span>
              <span className="font-medium tabular-nums text-green-600 dark:text-green-400">
                {formatCurrency(execution.total_buy_amount)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">순 현금 변동</span>
              <span className={cn(
                "font-bold tabular-nums",
                execution.net_cash_change >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {execution.net_cash_change >= 0 ? "+" : ""}
                {formatCurrency(execution.net_cash_change)}
              </span>
            </div>
          </div>

          {/* Orders - empty state */}
          {allOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              주문 데이터 없음
            </div>
          )}

          {/* Sell Orders */}
          {(sellOrders.length > 0 || resolvedSells.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-500/10 text-red-600 text-xs">매도</Badge>
                <span className="text-xs text-muted-foreground">
                  {sellOrders.filter((o) => o.over_executed || getExecQty(o) >= o.quantity).length}/{sellOrders.length} 체결
                </span>
              </div>
              <div className="space-y-0.5">
                {sellOrders.map((order) => (
                  <OrderRow key={`sell-${order.stock_code}`} order={order} />
                ))}
                {resolvedSells.map((order) => (
                  <OrderRow key={`sell-resolved-${order.stock_code}`} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Buy Orders */}
          {(buyOrders.length > 0 || resolvedBuys.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500/10 text-green-600 text-xs">매수</Badge>
                <span className="text-xs text-muted-foreground">
                  {buyOrders.filter((o) => o.over_executed || getExecQty(o) >= o.quantity).length}/{buyOrders.length} 체결
                </span>
              </div>
              <div className="space-y-0.5">
                {buyOrders.map((order) => (
                  <OrderRow key={`buy-${order.stock_code}`} order={order} />
                ))}
                {resolvedBuys.map((order) => (
                  <OrderRow key={`buy-resolved-${order.stock_code}`} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Snapshot */}
          {snapshot && (
            <div>
              <h4 className="text-sm font-semibold mb-2">실행 전 포트폴리오</h4>
              <div className="rounded-2xl border p-3 space-y-2">
                {snapshot.stocks.map((stock) => (
                  <div key={stock.stock_code} className="flex justify-between text-sm">
                    <span className="truncate flex-1">{stock.stock_name}</span>
                    <span className="tabular-nums text-muted-foreground text-xs ml-2">
                      {stock.quantity}주 × {formatCurrency(stock.price)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">현금</span>
                  <span className="tabular-nums font-medium">{formatCurrency(snapshot.cash)}</span>
                </div>
                {snapshot.exchange_rate > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>환율</span>
                    <span className="tabular-nums">{snapshot.exchange_rate.toLocaleString("ko-KR")}원/USD</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground text-right">
                  {format(new Date(snapshot.captured_at), "yyyy.MM.dd HH:mm")} 기준
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="w-full rounded-xl active:scale-[0.98] transition-transform">
              닫기
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
