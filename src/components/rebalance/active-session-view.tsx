"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Pause,
  Save,
  Loader2,
  ArrowRightLeft,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ProgressiveOrderList } from "@/components/rebalance/progressive-order-list";
import { ProgressSummary } from "@/components/rebalance/progress-summary";
import { CompletionReviewSheet } from "@/components/rebalance/completion-review-sheet";
import { EffectivePortfolioCard } from "@/components/rebalance/effective-portfolio-card";
import { PRICE_CHANGE_THRESHOLD } from "@/lib/rebalance/constants";
import type {
  RebalanceExecution,
  ExecutionOrderResult,
} from "@/lib/rebalance/history-types";
import type { PendingOrder } from "@/hooks/use-progressive-rebalance";

interface ManualStockInfo {
  stock_code: string;
  stock_name: string;
  current_price: number;
  currency?: string;
  target_pct?: number;
}

export interface ActiveSessionViewProps {
  session: RebalanceExecution;
  accountName: string | null;
  manualStocks: ManualStockInfo[];
  exchangeRate: number;
  onBack?: () => void;
  // useProgressiveRebalance functions
  updateOrderQuantity: (
    executionId: string,
    stockCode: string,
    executedQuantity: number,
    actualPrice?: number,
  ) => void;
  pendingOrders: Map<string, PendingOrder>;
  batchFillOrders: (
    executionId: string,
    orders: Array<{ stock_code: string; quantity: number }>,
  ) => Promise<void>;
  completeSession: (executionId: string) => Promise<void>;
  abandonSession: (executionId: string) => Promise<void>;
  recalculateRemaining: (executionId: string) => Promise<void>;
  getProgress: (
    orders: ExecutionOrderResult[],
  ) => { completed: number; total: number; percentage: number };
  lastSavedAt: Date | null;
  isSaving: boolean;
  isCompleting: boolean;
  isAbandoning: boolean;
  isRecalculating: boolean;
}

export function ActiveSessionView({
  session,
  accountName,
  manualStocks,
  exchangeRate,
  onBack,
  updateOrderQuantity,
  pendingOrders,
  batchFillOrders,
  completeSession,
  abandonSession,
  recalculateRemaining,
  getProgress,
  lastSavedAt,
  isSaving,
  isCompleting,
  isAbandoning,
  isRecalculating,
}: ActiveSessionViewProps) {
  const router = useRouter();

  // Dialog states
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);

  // 매도 완료 후 재계산 권고 배너 dismiss 상태
  // 페이지 이동 후 복귀 시 다시 표시 — 의도된 동작 (시세가 변했을 수 있음)
  const [recalcBannerDismissed, setRecalcBannerDismissed] = useState(false);

  const sellOrders = session.orders.filter((o) => o.side === "sell");
  const buyOrders = session.orders.filter((o) => o.side === "buy");
  const startedAt = session.started_at ? new Date(session.started_at) : null;
  const now = useMemo(() => Date.now(), []);
  const daysSinceStart = startedAt
    ? (now - startedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const isStale = daysSinceStart > 30;

  // Phase derivation (for sell-complete banner logic)
  const activeSellOrders = sellOrders.filter((o) => !o.resolved_by_recalc);
  const activeBuyOrders = buyOrders.filter((o) => !o.resolved_by_recalc);
  const allActiveSellsFilled =
    activeSellOrders.length === 0 ||
    activeSellOrders.every(
      (o) => (o.executed_quantity ?? 0) >= o.quantity,
    );
  const allActiveBuysFilled =
    activeBuyOrders.length === 0 ||
    activeBuyOrders.every(
      (o) => (o.executed_quantity ?? 0) >= o.quantity,
    );
  const anyActiveBuyUnfilled = activeBuyOrders.some(
    (o) => (o.executed_quantity ?? 0) < o.quantity,
  );

  // 매도 완료 → 매수 재계산 권고 배너 조건
  const showSellCompleteBanner =
    activeSellOrders.length > 0 &&
    allActiveSellsFilled &&
    anyActiveBuyUnfilled &&
    !recalcBannerDismissed;

  // 계획 매도 대금 vs 실제 매도 대금
  const plannedSellAmount = activeSellOrders.reduce(
    (sum, o) => sum + o.estimated_amount,
    0,
  );
  const actualSellAmount = activeSellOrders.reduce(
    (sum, o) =>
      sum +
      (o.executed_quantity ?? 0) *
        (o.actual_price ?? o.estimated_price),
    0,
  );
  const sellDelta = actualSellAmount - plannedSellAmount;

  // Price change detection
  const priceChanges = useMemo(() => {
    if (!session.portfolio_snapshot) return [];
    const snapshot = session.portfolio_snapshot;
    const refPrices = session.recalculated_prices;
    const changes: Array<{
      stock_code: string;
      stock_name: string;
      refPrice: number;
      currentPrice: number;
      changePct: number;
    }> = [];
    for (const snapStock of snapshot.stocks) {
      const current = manualStocks.find(
        (s) => s.stock_code === snapStock.stock_code,
      );
      if (!current) continue;
      const isUsd = current.currency === "USD";
      const currentPriceKrw = isUsd
        ? current.current_price * exchangeRate
        : current.current_price;
      const recalcNative = refPrices?.[snapStock.stock_code];
      const refPrice =
        recalcNative != null
          ? isUsd
            ? recalcNative * exchangeRate
            : recalcNative
          : snapStock.price;
      if (refPrice <= 0) continue;
      const changePct = (currentPriceKrw - refPrice) / refPrice;
      if (Math.abs(changePct) >= PRICE_CHANGE_THRESHOLD) {
        changes.push({
          stock_code: snapStock.stock_code,
          stock_name: snapStock.stock_name,
          refPrice,
          currentPrice: currentPriceKrw,
          changePct,
        });
      }
    }
    return changes;
  }, [session, manualStocks, exchangeRate]);

  // Target map + currency map for effective portfolio card
  const targetMap = useMemo(
    () => new Map(manualStocks.map((s) => [s.stock_code, s.target_pct ?? 0])),
    [manualStocks],
  );
  const currencyMap = useMemo(
    () => new Map(manualStocks.map((s) => [s.stock_code, s.currency ?? "KRW"])),
    [manualStocks],
  );

  // Sell/buy completion counts for section headers
  const sellCompleted = activeSellOrders.filter(
    (o) => o.over_executed || (o.executed_quantity ?? 0) >= o.quantity,
  ).length;
  const buyCompleted = activeBuyOrders.filter(
    (o) => o.over_executed || (o.executed_quantity ?? 0) >= o.quantity,
  ).length;

  // Handlers
  function handleQuantityChange(
    stockCode: string,
    executedQuantity: number,
    actualPrice?: number,
  ) {
    updateOrderQuantity(session.id, stockCode, executedQuantity, actualPrice);
  }

  async function handleRecalculate() {
    try {
      await recalculateRemaining(session.id);
      setRecalcOpen(false);
      setRecalcBannerDismissed(true);
      toast.success("잔여 주문이 현재 시세 기준으로 재계산되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`재계산에 실패했습니다: ${msg}`);
    }
  }

  async function handleComplete() {
    try {
      const progress = getProgress(session.orders);
      await completeSession(session.id);
      setCompleteOpen(false);
      toast.success(
        progress.completed >= progress.total
          ? "리밸런싱이 완료되었습니다! 포트폴리오가 업데이트되었습니다."
          : "리밸런싱이 부분 완료되었습니다. 체결된 주문만 포트폴리오에 반영되었습니다.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`완료 처리에 실패했습니다: ${msg}`);
    }
  }

  async function handleAbandon() {
    try {
      await abandonSession(session.id);
      setAbandonOpen(false);
      toast.success("리밸런싱 세션이 포기되었습니다.");
    } catch {
      toast.error("포기 처리에 실패했습니다.");
    }
  }

  const handleBatchFillSell = () => {
    const unfilled = sellOrders.filter(
      (o) => (o.executed_quantity ?? 0) < o.quantity,
    );
    if (unfilled.length > 0) {
      batchFillOrders(
        session.id,
        unfilled.map((o) => ({
          stock_code: o.stock_code,
          quantity: o.quantity,
        })),
      );
    }
  };

  const handleBatchFillBuy = () => {
    const unfilled = buyOrders.filter(
      (o) => (o.executed_quantity ?? 0) < o.quantity,
    );
    if (unfilled.length > 0) {
      batchFillOrders(
        session.id,
        unfilled.map((o) => ({
          stock_code: o.stock_code,
          quantity: o.quantity,
        })),
      );
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 pb-28">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              진행중
            </span>
            <h1 className="text-xl font-bold tracking-tight">
              리밸런싱 실행
              {accountName && (
                <span className="ml-1.5 text-muted-foreground font-medium">
                  · {accountName}
                </span>
              )}
            </h1>
            {/* Auto-save indicator */}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  저장 중...
                </>
              ) : lastSavedAt ? (
                <>
                  <Save className="size-3" />
                  자동 저장됨 ·{" "}
                  {formatDistanceToNow(lastSavedAt, {
                    locale: ko,
                    addSuffix: false,
                  })}{" "}
                  전
                </>
              ) : null}
            </span>
          </div>
          <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
            <span>
              증권사 앱에서 주문을 실행하고, 실제 체결 수량을 입력하세요.
            </span>
            {startedAt && (
              <span className="inline-flex items-center gap-1 text-xs shrink-0">
                <Clock className="size-3" />
                {formatDistanceToNow(startedAt, {
                  locale: ko,
                  addSuffix: true,
                })}{" "}
                시작
              </span>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <ProgressSummary
          orders={session.orders}
          totalBuyAmount={session.total_buy_amount}
          totalSellAmount={session.total_sell_amount}
        />

        {/* Banners */}

        {/* Stale session warning */}
        {isStale && (
          <div className="rounded-2xl p-5 bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50 flex items-start gap-4">
            <div className="bg-card p-2 rounded-full shadow-sm">
              <Clock className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-orange-800 dark:text-orange-200">
                오래된 세션
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 opacity-90">
                시작된 지{" "}
                {startedAt &&
                  formatDistanceToNow(startedAt, {
                    locale: ko,
                    addSuffix: false,
                  })}{" "}
                경과. 시세가 크게 변했을 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Sell-complete recalculate banner */}
        {showSellCompleteBanner && (
          <div className="rounded-2xl p-5 bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50 flex items-start gap-4">
            <div className="bg-card p-2 rounded-full shadow-sm">
              <ArrowRightLeft className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">매도가 완료되었습니다</p>
                <p className="text-xs mt-1 opacity-90">
                  실제 매도 대금과 현재 시세를 반영하여 매수 주문을
                  재계산하시겠습니까?
                </p>
                {sellDelta !== 0 && (
                  <p className="text-xs mt-1 tabular-nums">
                    매도 대금: 계획 {formatCurrency(plannedSellAmount)} → 실제{" "}
                    {formatCurrency(actualSellAmount)}{" "}
                    <span
                      className={cn(
                        "font-medium",
                        sellDelta > 0
                          ? "text-green-700 dark:text-green-400"
                          : "text-red-700 dark:text-red-400",
                      )}
                    >
                      ({sellDelta > 0 ? "+" : ""}
                      {formatCurrency(sellDelta)})
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecalcOpen(true)}
                  disabled={isRecalculating}
                  className="gap-1.5 rounded-xl h-9 text-xs font-semibold bg-transparent border-blue-200 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900/50"
                >
                  <RefreshCw
                    className={cn(
                      "size-3",
                      isRecalculating && "animate-spin",
                    )}
                  />
                  {isRecalculating ? "재계산 중..." : "매수 주문 재계산"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecalcBannerDismissed(true)}
                  className="h-9 rounded-xl text-xs text-muted-foreground"
                >
                  현재 주문 유지
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Price change warning banner */}
        {priceChanges.length > 0 && (
          <div className="rounded-2xl p-5 bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50 flex items-start gap-4">
            <div className="bg-card p-2 rounded-full shadow-sm">
              <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">
                  시세 변동 감지 ({priceChanges.length}개 종목)
                </p>
                <ul className="mt-1 space-y-0.5 text-xs opacity-90">
                  {priceChanges.map((pc) => (
                    <li key={pc.stock_code}>
                      {pc.stock_name}: {formatCurrency(pc.refPrice)} →{" "}
                      {formatCurrency(pc.currentPrice)}{" "}
                      <span
                        className={cn(
                          "font-medium",
                          pc.changePct > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-blue-600 dark:text-blue-400",
                        )}
                      >
                        ({pc.changePct > 0 ? "+" : ""}
                        {(pc.changePct * 100).toFixed(1)}%)
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs opacity-80">
                  미체결 주문의 수량이 현재 시세와 맞지 않을 수 있습니다.
                  재계산을 권장합니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecalcOpen(true)}
                disabled={isRecalculating}
                className="gap-1.5 rounded-xl h-9 text-xs font-semibold bg-transparent border-orange-200 hover:bg-orange-100 dark:border-orange-800 dark:hover:bg-orange-900/50"
              >
                <RefreshCw
                  className={cn(
                    "size-3",
                    isRecalculating && "animate-spin",
                  )}
                />
                {isRecalculating ? "재계산 중..." : "잔여 주문 재계산"}
              </Button>
            </div>
          </div>
        )}

        {/* Sell Orders Section */}
        {sellOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-full bg-red-100 text-red-700 text-xs font-bold dark:bg-red-900/30 dark:text-red-400">
                  1
                </span>
                매도 주문
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {sellCompleted}/{activeSellOrders.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={allActiveSellsFilled}
                  onClick={handleBatchFillSell}
                  className="h-8 text-xs gap-1.5 rounded-xl"
                >
                  <CheckCheck className="size-3.5" />
                  전체 체결
                </Button>
              </div>
            </div>
            <ProgressiveOrderList
              orders={session.orders}
              side="sell"
              onQuantityChange={handleQuantityChange}
              disabled={false}
              pendingOrders={pendingOrders}
            />
          </div>
        )}

        {/* Buy Orders Section */}
        {buyOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold dark:bg-blue-900/30 dark:text-blue-400">
                  {sellOrders.length > 0 ? 2 : 1}
                </span>
                매수 주문
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {buyCompleted}/{activeBuyOrders.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={allActiveBuysFilled}
                  onClick={handleBatchFillBuy}
                  className="h-8 text-xs gap-1.5 rounded-xl"
                >
                  <CheckCheck className="size-3.5" />
                  전체 체결
                </Button>
              </div>
            </div>
            <ProgressiveOrderList
              orders={session.orders}
              side="buy"
              onQuantityChange={handleQuantityChange}
              disabled={false}
              pendingOrders={pendingOrders}
            />
          </div>
        )}

        {/* Effective Portfolio Card (inline, after orders) */}
        {session.portfolio_snapshot && (
          <EffectivePortfolioCard
            orders={session.orders}
            snapshot={session.portfolio_snapshot}
            targetMap={targetMap}
            currencyMap={currencyMap}
            startedAt={session.started_at}
          />
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border/50 safe-area-pb">
        <div className="max-w-2xl mx-auto px-5 py-4 space-y-3">
          {/* Primary row */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-semibold text-sm gap-2 active:scale-[0.98] transition-transform"
              onClick={() => {
                toast.success(
                  "진행 상태가 자동 저장되었습니다. 언제든 돌아와서 이어할 수 있습니다.",
                );
                router.push("/portfolio");
              }}
            >
              <Pause className="size-4" />
              나중에 계속
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl font-bold text-base gap-2 shadow-md active:scale-[0.98] transition-transform bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setCompleteOpen(true)}
            >
              <CheckCircle2 className="size-5" />
              리밸런싱 완료
            </Button>
          </div>
          {/* Secondary row */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1 h-10 rounded-xl text-sm font-medium gap-2 text-muted-foreground"
              onClick={() => setRecalcOpen(true)}
              disabled={isRecalculating}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  isRecalculating && "animate-spin",
                )}
              />
              재계산
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-10 rounded-xl text-sm font-medium gap-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setAbandonOpen(true)}
            >
              <XCircle className="size-4" />
              포기
            </Button>
          </div>
        </div>
      </div>

      {/* Completion review sheet */}
      <CompletionReviewSheet
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        orders={session.orders}
        totalBuyAmount={session.total_buy_amount}
        totalSellAmount={session.total_sell_amount}
        onConfirm={handleComplete}
        isCompleting={isCompleting}
      />

      {/* Recalculate confirmation dialog */}
      <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>잔여 주문 재계산</DialogTitle>
            <DialogDescription>
              현재 시세를 기준으로 미체결 주문의 수량을 다시 계산합니다. 이미
              체결된 주문은 유지됩니다.
            </DialogDescription>
          </DialogHeader>
          {priceChanges.length > 0 && (
            <div className="text-sm space-y-1 rounded-2xl border p-3 bg-muted/50">
              <p className="font-medium text-muted-foreground">
                변동 감지 종목:
              </p>
              {priceChanges.map((pc) => (
                <div key={pc.stock_code} className="flex justify-between">
                  <span>{pc.stock_name}</span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      pc.changePct > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400",
                    )}
                  >
                    {pc.changePct > 0 ? "+" : ""}
                    {(pc.changePct * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">취소</Button>
            </DialogClose>
            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="gap-2 rounded-xl"
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  isRecalculating && "animate-spin",
                )}
              />
              {isRecalculating ? "재계산 중..." : "재계산 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon dialog */}
      <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리밸런싱 포기</DialogTitle>
            <DialogDescription>
              이 리밸런싱 세션을 포기하시겠습니까? 진행 상태는 기록에
              보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">취소</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={isAbandoning}
              className="rounded-xl"
            >
              {isAbandoning ? "처리 중..." : "포기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
