"use client";

import { AlertTriangle, Check, Minus, Circle, Sparkles } from "lucide-react";
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
import type { ExecutionOrderResult } from "@/lib/rebalance/history-types";
import { useSubscription } from "@/hooks/use-subscription";
import { useAISessionReport } from "@/hooks/use-ai-session-report";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { AI_GENERATED_LABEL } from "@/lib/ai/disclaimer";

interface CompletionReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: ExecutionOrderResult[];
  totalBuyAmount: number;
  totalSellAmount: number;
  onConfirm: () => void;
  isCompleting: boolean;
}

function getExecQty(order: ExecutionOrderResult): number {
  return order.executed_quantity ?? 0;
}

function OrderStatusIcon({ order }: { order: ExecutionOrderResult }) {
  const qty = getExecQty(order);
  if (qty >= order.quantity) {
    return <Check className="size-4 text-green-600 dark:text-green-400 shrink-0" />;
  }
  if (qty > 0) {
    return <Minus className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />;
  }
  return <Circle className="size-4 text-muted-foreground shrink-0" />;
}

export function CompletionReviewSheet({
  open,
  onOpenChange,
  orders,
  totalBuyAmount,
  totalSellAmount,
  onConfirm,
  isCompleting,
}: CompletionReviewSheetProps) {
  const { isPro } = useSubscription();
  const aiReport = useAISessionReport();

  // Filter out resolved orders (no longer needed after recalculation)
  const activeOrders = orders.filter((o) => !o.resolved_by_recalc);
  const sellOrders = activeOrders.filter((o) => o.side === "sell");
  const buyOrders = activeOrders.filter((o) => o.side === "buy");

  const totalOrders = activeOrders.length;
  const filledOrders = activeOrders.filter((o) => o.over_executed || getExecQty(o) >= o.quantity).length;
  const unfilledOrders = totalOrders - filledOrders;
  const isPartial = unfilledOrders > 0;

  const executedSellAmount = sellOrders.reduce(
    (sum, o) => sum + getExecQty(o) * (o.actual_price ?? o.estimated_price), 0
  );
  const executedBuyAmount = buyOrders.reduce(
    (sum, o) => sum + getExecQty(o) * (o.actual_price ?? o.estimated_price), 0
  );
  const executedNetCash = executedSellAmount - executedBuyAmount;

  function buildSessionData(): string {
    const lines: string[] = [
      `총 주문: ${totalOrders}건 (매도 ${sellOrders.length}건, 매수 ${buyOrders.length}건)`,
      `체결: ${filledOrders}건, 미체결: ${unfilledOrders}건`,
      `매도 금액: ${formatCurrency(executedSellAmount)}`,
      `매수 금액: ${formatCurrency(executedBuyAmount)}`,
      `순 현금 변동: ${executedNetCash >= 0 ? "+" : ""}${formatCurrency(executedNetCash)}`,
    ];
    if (sellOrders.length > 0) {
      lines.push(`매도 종목: ${sellOrders.map((o) => `${o.stock_name}(${getExecQty(o)}/${o.quantity}주)`).join(", ")}`);
    }
    if (buyOrders.length > 0) {
      lines.push(`매수 종목: ${buyOrders.map((o) => `${o.stock_name}(${getExecQty(o)}/${o.quantity}주)`).join(", ")}`);
    }
    return lines.join("\n");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>리밸런싱 결과 확인</SheetTitle>
          <SheetDescription>
            최종 완료 전 체결 내역을 확인하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">전체 주문</div>
              <div className="text-lg font-bold tabular-nums">{totalOrders}건</div>
              <div className="text-xs text-muted-foreground">
                매도 {sellOrders.length} · 매수 {buyOrders.length}
              </div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">체결 주문</div>
              <div className={cn(
                "text-lg font-bold tabular-nums",
                isPartial ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
              )}>
                {filledOrders}건
              </div>
              {isPartial && (
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  미체결 {unfilledOrders}건
                </div>
              )}
            </div>
          </div>

          {/* Amount summary */}
          <div className="rounded-2xl border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">매도 금액</span>
              <div className="text-right tabular-nums">
                <div className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(executedSellAmount)}
                </div>
                {executedSellAmount !== totalSellAmount && (
                  <div className="text-xs text-muted-foreground line-through">
                    {formatCurrency(totalSellAmount)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">매수 금액</span>
              <div className="text-right tabular-nums">
                <div className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(executedBuyAmount)}
                </div>
                {executedBuyAmount !== totalBuyAmount && (
                  <div className="text-xs text-muted-foreground line-through">
                    {formatCurrency(totalBuyAmount)}
                  </div>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">순 현금 변동</span>
              <span className={cn(
                "font-bold tabular-nums",
                executedNetCash >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {executedNetCash >= 0 ? "+" : ""}{formatCurrency(executedNetCash)}
              </span>
            </div>
          </div>

          {/* Partial execution warning */}
          {isPartial && (
            <div className="flex items-start gap-2 rounded-2xl border border-orange-500/50 bg-orange-50 p-3 dark:bg-orange-950/30">
              <AlertTriangle className="size-4 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="text-xs text-orange-800 dark:text-orange-200">
                <p className="font-medium">{unfilledOrders}건의 주문이 미체결입니다</p>
                <p>체결된 수량만 포트폴리오에 반영됩니다.</p>
              </div>
            </div>
          )}

          {/* Order details - Sell */}
          {sellOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-500/10 text-red-600 text-xs">매도</Badge>
                <span className="text-xs text-muted-foreground">
                  {sellOrders.filter((o) => getExecQty(o) >= o.quantity).length}/{sellOrders.length} 체결
                </span>
              </div>
              <div className="space-y-1">
                {sellOrders.map((order) => {
                  const qty = getExecQty(order);
                  const isFull = qty >= order.quantity;
                  const isUnfilled = qty === 0;
                  return (
                    <div
                      key={order.stock_code}
                      className={cn(
                        "flex items-center gap-2 text-sm py-1.5 px-2 rounded-xl",
                        isUnfilled && "bg-orange-50/50 dark:bg-orange-950/20"
                      )}
                    >
                      <OrderStatusIcon order={order} />
                      <span className={cn("flex-1 truncate", isFull && "text-muted-foreground")}>
                        {order.stock_name}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {qty}/{order.quantity}주
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order details - Buy */}
          {buyOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500/10 text-green-600 text-xs">매수</Badge>
                <span className="text-xs text-muted-foreground">
                  {buyOrders.filter((o) => getExecQty(o) >= o.quantity).length}/{buyOrders.length} 체결
                </span>
              </div>
              <div className="space-y-1">
                {buyOrders.map((order) => {
                  const qty = getExecQty(order);
                  const isFull = qty >= order.quantity;
                  const isUnfilled = qty === 0;
                  return (
                    <div
                      key={order.stock_code}
                      className={cn(
                        "flex items-center gap-2 text-sm py-1.5 px-2 rounded-xl",
                        isUnfilled && "bg-orange-50/50 dark:bg-orange-950/20"
                      )}
                    >
                      <OrderStatusIcon order={order} />
                      <span className={cn("flex-1 truncate", isFull && "text-muted-foreground")}>
                        {order.stock_name}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {qty}/{order.quantity}주
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* AI 세션 리포트 */}
          {isPro && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl gap-2 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 active:scale-[0.98] transition-transform"
                onClick={() => aiReport.mutate(buildSessionData())}
                disabled={aiReport.isPending}
              >
                <Sparkles className="size-4" />
                {aiReport.isPending ? "리포트 생성 중..." : "AI 세션 리포트"}
              </Button>

              {aiReport.isError && (
                <p className="text-xs text-destructive text-center">
                  {aiReport.error instanceof Error
                    ? aiReport.error.message
                    : "리포트 생성 실패"}
                </p>
              )}

              {aiReport.data && (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                    <Sparkles className="size-3" />
                    <span>{AI_GENERATED_LABEL}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {aiReport.data.report}
                  </p>
                  <AIDisclaimer />
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="w-full rounded-xl active:scale-[0.98] transition-transform">
              뒤로
            </Button>
          </SheetClose>
          <Button
            onClick={onConfirm}
            disabled={isCompleting}
            className="w-full rounded-xl active:scale-[0.98] transition-transform"
          >
            {isCompleting ? "처리 중..." : isPartial ? "부분 완료로 저장" : "리밸런싱 완료"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
