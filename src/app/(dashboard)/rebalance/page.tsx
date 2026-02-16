"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FolderInput,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAccounts } from "@/hooks/use-accounts";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { usePresets } from "@/hooks/use-presets";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import { toPortfolioItems } from "@/lib/rebalance/helpers";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/layout/page-transition";
import { TargetWeightEditor } from "@/components/rebalance/target-weight-editor";
import { ProgressiveOrderList } from "@/components/rebalance/progressive-order-list";
import { ProgressSummary } from "@/components/rebalance/progress-summary";
import { RebalanceStepper } from "@/components/rebalance/rebalance-stepper";
import type { RebalancePhase } from "@/components/rebalance/rebalance-stepper";
import { CompletionReviewSheet } from "@/components/rebalance/completion-review-sheet";
import { PresetSelector } from "@/components/rebalance/preset-selector";
import { PresetManager } from "@/components/rebalance/preset-manager";

export default function RebalancePage() {
  const { selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const isAllMode = selectedAccountId === "all";

  const {
    data: balance,
    isLoading,
    isError,
    error,
    targets,
    exchangeRate,
  } = usePortfolioData(portfolioId);
  const {
    stocks: manualStocks,
    portfolio,
    activePresetId,
    updateBatchTargets,
    applyPreset,
    isApplying,
    isLoading: isManualLoading,
  } = useManualPortfolio(portfolioId, exchangeRate);
  const { getPreset, isLoading: isPresetsLoading } = usePresets();
  const {
    activeSession,
    isLoadingSession,
    refetchActiveSession,
    startSession,
    updateOrderQuantity,
    batchFillOrders,
    completeSession,
    abandonSession,
    getProgress,
    isStarting,
    isCompleting,
    isAbandoning,
  } = useProgressiveRebalance(portfolioId);

  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [showEditor, setShowEditor] = useState(false);

  const cashAmount = Number(portfolio?.cash ?? 0);
  const totalValue = balance?.total_value ?? 0;

  const hasStocks = manualStocks.length > 0;
  const hasTargets = targets.some((t) => !t.is_cash && t.target_pct > 0);
  const canSimulate = hasStocks && hasTargets && !!balance;
  const hasActiveSession = !!activeSession;

  const portfolioStockCodes = useMemo(
    () => new Set(manualStocks.map((s) => s.stock_code)),
    [manualStocks],
  );

  // Capture current time once per render for staleness check
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);

  // --- Preset state detection ---
  const activePreset = activePresetId ? getPreset(activePresetId) : null;
  const presetDeleted = !!activePresetId && !activePreset && !isPresetsLoading;

  // Check if current targets differ from the linked preset
  const isTargetModified = useMemo(() => {
    if (!activePreset) return false;
    const presetMap = new Map(
      activePreset.targets.map((t) => [t.stock_code, t.target_pct]),
    );
    for (const s of manualStocks) {
      const presetPct = presetMap.get(s.stock_code) ?? 0;
      if (Math.abs(s.target_pct - presetPct) > 0.01) return true;
    }
    for (const t of activePreset.targets) {
      if (!manualStocks.find((s) => s.stock_code === t.stock_code) && t.target_pct > 0)
        return true;
    }
    return false;
  }, [activePreset, manualStocks]);

  // Compact comparison data for read-only current vs target view
  const comparisonData = useMemo(() => {
    if (!balance || !manualStocks.length) return [];
    return manualStocks.map((stock) => {
      const evalAmount =
        stock.currency === "USD"
          ? stock.current_price * exchangeRate * stock.quantity
          : stock.current_price * stock.quantity;
      const currentPct = totalValue > 0 ? (evalAmount / totalValue) * 100 : 0;
      return {
        id: stock.id,
        stock_name: stock.stock_name,
        stock_code: stock.stock_code,
        currentPct,
        targetPct: stock.target_pct,
        diff: stock.target_pct - currentPct,
      };
    });
  }, [manualStocks, balance, exchangeRate, totalValue]);

  const cashCurrentPct = totalValue > 0 ? (cashAmount / totalValue) * 100 : 0;
  const totalStockTargetPct = manualStocks.reduce((sum, s) => sum + s.target_pct, 0);
  const cashTargetPct = Math.max(0, 100 - totalStockTargetPct);
  const cashDiff = cashTargetPct - cashCurrentPct;

  function handleApplyPreset(
    presetTargets: import("@/lib/rebalance/preset-types").PresetTarget[],
    presetId: string,
  ) {
    applyPreset(presetTargets, {
      presetId,
      onSuccess: () => {
        toast.success("프리셋이 적용되었습니다.");
        setPresetSelectorOpen(false);
        setEditorKey((k) => k + 1);
        setShowEditor(false);
      },
      onError: (error: Error) => {
        toast.error(`프리셋 적용에 실패했습니다: ${error.message}`);
      },
    });
  }

  function handleReapplyPreset() {
    if (!activePreset) return;
    applyPreset(activePreset.targets, {
      presetId: activePreset.id,
      onSuccess: () => {
        toast.success("프리셋이 다시 적용되었습니다.");
        setEditorKey((k) => k + 1);
      },
      onError: (error: Error) => {
        toast.error(`프리셋 적용에 실패했습니다: ${error.message}`);
      },
    });
  }

  function handleSaveTargets(updates: { id: string; targetPct: number }[]) {
    setIsSavingTargets(true);
    updateBatchTargets(updates, {
      onSuccess: () => {
        toast.success("목표 비중이 저장되었습니다.");
        setIsSavingTargets(false);
      },
      onError: (error: unknown) => {
        const msg =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: string }).message)
              : JSON.stringify(error);
        console.error("목표 비중 저장 실패:", msg, error);
        toast.error(`목표 비중 저장에 실패했습니다: ${msg}`);
        setIsSavingTargets(false);
      },
    });
  }

  // Single action: calculate + start session
  async function handleStartRebalancing() {
    if (!balance) return;

    // Guard: if active session already exists, don't try to create another
    if (activeSession) {
      toast.info("이미 진행중인 세션이 있습니다. 먼저 완료하거나 포기해주세요.");
      return;
    }

    const portfolioItems = toPortfolioItems(
      balance.stocks,
      targets,
      cashAmount
    );
    const result = simulateRebalance(portfolioItems, targets);

    if (result.orders.length === 0) {
      toast.info(
        "리밸런싱이 필요하지 않습니다. 포트폴리오가 이미 목표 비중에 근접합니다."
      );
      return;
    }

    try {
      const snapshot = {
        stocks: balance.stocks.map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          quantity: s.quantity,
          price: s.current_price,
        })),
        cash: cashAmount,
        exchange_rate: exchangeRate,
        captured_at: new Date().toISOString(),
      };

      await startSession({
        simulationResult: result,
        portfolioSnapshot: snapshot,
        presetName: activePreset?.name,
      });

      toast.success("리밸런싱이 시작되었습니다. 체결 수량을 입력하세요.");
    } catch (err) {
      // Session creation failed — check if a stale in_progress record exists.
      console.error(
        "[Rebalance] startSession failed:",
        err instanceof Error ? err.message : JSON.stringify(err)
      );

      // Force-refresh: if a stale session is found, page auto-transitions.
      const { data: existingSession } = await refetchActiveSession();
      if (existingSession) {
        toast.info("기존 진행중인 세션이 있습니다. 완료하거나 포기해주세요.");
      } else {
        toast.error(
          `리밸런싱 시작에 실패했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
        );
      }
    }
  }

  function handleQuantityChange(stockCode: string, executedQuantity: number) {
    if (!activeSession) return;
    updateOrderQuantity(activeSession.id, stockCode, executedQuantity);
  }

  async function handleComplete() {
    if (!activeSession) return;
    try {
      const progress = getProgress(activeSession.orders);
      await completeSession(activeSession.id);
      setCompleteOpen(false);
      toast.success(
        progress.completed >= progress.total
          ? "리밸런싱이 완료되었습니다! 포트폴리오가 업데이트되었습니다."
          : "리밸런싱이 부분 완료되었습니다. 체결된 주문만 포트폴리오에 반영되었습니다."
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`완료 처리에 실패했습니다: ${msg}`);
    }
  }

  async function handleAbandon() {
    if (!activeSession) return;
    try {
      await abandonSession(activeSession.id);
      setAbandonOpen(false);
      toast.success("리밸런싱 세션이 포기되었습니다.");
    } catch {
      toast.error("포기 처리에 실패했습니다.");
    }
  }

  // Loading (wait for session check too, to avoid showing button when stale session exists)
  if (isLoading || isManualLoading || isLoadingSession) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <div className="space-y-3">
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Must select specific account for rebalancing
  if (isAllMode) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <p className="text-muted-foreground">
                리밸런싱을 실행하려면 특정 계좌를 선택해주세요.
              </p>
              <p className="text-sm text-muted-foreground">
                헤더의 계좌 선택 메뉴에서 개별 계좌를 선택하세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // Error
  if (isError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <p className="text-destructive">
                포트폴리오 데이터를 불러오는 데 실패했습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "알 수 없는 오류"}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // No stocks
  if (!hasStocks) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <p className="text-muted-foreground">
                포트폴리오에 종목을 추가해주세요.
              </p>
              <Button asChild>
                <Link href="/portfolio">포트폴리오 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // ── Active session view ──────────────────────────────────────
  if (hasActiveSession) {
    const sellOrders = activeSession.orders.filter((o) => o.side === "sell");
    const buyOrders = activeSession.orders.filter((o) => o.side === "buy");
    const startedAt = activeSession.started_at
      ? new Date(activeSession.started_at)
      : null;
    const daysSinceStart = startedAt
      ? (now - startedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const isStale = daysSinceStart > 30;

    // Derive current phase from order data (전량 체결 기준)
    const allSellsFilled = sellOrders.length === 0 || sellOrders.every((o) => (o.executed_quantity ?? 0) >= o.quantity);
    const allBuysFilled = buyOrders.length === 0 || buyOrders.every((o) => (o.executed_quantity ?? 0) >= o.quantity);
    const currentPhase: RebalancePhase =
      allSellsFilled && allBuysFilled ? "review" :
      allSellsFilled ? "buy" : "sell";

    const handleBatchFillSell = () => {
      const unfilled = sellOrders.filter((o) => (o.executed_quantity ?? 0) < o.quantity);
      if (unfilled.length > 0) {
        batchFillOrders(activeSession.id, unfilled.map((o) => ({ stock_code: o.stock_code, quantity: o.quantity })));
      }
    };
    const handleBatchFillBuy = () => {
      const unfilled = buyOrders.filter((o) => (o.executed_quantity ?? 0) < o.quantity);
      if (unfilled.length > 0) {
        batchFillOrders(activeSession.id, unfilled.map((o) => ({ stock_code: o.stock_code, quantity: o.quantity })));
      }
    };

    return (
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
                리밸런싱
              </h1>
              <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                <Clock className="size-4" />
                진행중
              </span>
            </div>
            <p className="text-muted-foreground">
              증권사 앱에서 주문을 실행하고, 체결 수량을 입력하세요.
            </p>
          </div>

          {/* Step indicator */}
          <RebalanceStepper
            currentPhase={currentPhase}
            hasSellOrders={sellOrders.length > 0}
          />

          {/* Stale warning */}
          {isStale && (
            <div className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-50 p-4 dark:bg-orange-950/30">
              <Clock className="size-5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">오래된 세션입니다</p>
                <p>
                  이 리밸런싱 세션이 시작된 지{" "}
                  {startedAt &&
                    formatDistanceToNow(startedAt, {
                      locale: ko,
                      addSuffix: false,
                    })}
                  이 경과했습니다. 시장 가격이 크게 변동되었을 수 있으니 포기
                  후 새로 시작하는 것을 권장합니다.
                </p>
              </div>
            </div>
          )}

          {/* Reference banner */}
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-950/30">
            <AlertTriangle className="size-5 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">참고용 안내입니다</p>
              <p>실제 주문은 증권사 앱(HTS/MTS)에서 직접 실행해주세요.</p>
            </div>
          </div>

          {/* Progress summary */}
          <ProgressSummary
            orders={activeSession.orders}
            totalBuyAmount={activeSession.total_buy_amount}
            totalSellAmount={activeSession.total_sell_amount}
          />

          {/* Sell orders */}
          {sellOrders.length > 0 && (
            <ProgressiveOrderList
              orders={activeSession.orders}
              side="sell"
              stepNumber={1}
              onQuantityChange={handleQuantityChange}
              onBatchFill={handleBatchFillSell}
              disabled={false}
            />
          )}

          {/* Buy orders */}
          {buyOrders.length > 0 && (
            <ProgressiveOrderList
              orders={activeSession.orders}
              side="buy"
              stepNumber={sellOrders.length > 0 ? 2 : 1}
              onQuantityChange={handleQuantityChange}
              onBatchFill={handleBatchFillBuy}
              disabled={false}
            />
          )}

          {/* Action buttons */}
          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setCompleteOpen(true)} className="gap-2">
              <CheckCircle2 className="size-4" />
              리밸런싱 완료
            </Button>
            <Button
              variant="outline"
              onClick={() => setAbandonOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <XCircle className="size-4" />
              포기
            </Button>
          </div>
        </div>

        {/* Completion review sheet */}
        <CompletionReviewSheet
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          orders={activeSession.orders}
          totalBuyAmount={activeSession.total_buy_amount}
          totalSellAmount={activeSession.total_sell_amount}
          onConfirm={handleComplete}
          isCompleting={isCompleting}
        />

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
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleAbandon}
                disabled={isAbandoning}
              >
                {isAbandoning ? "처리 중..." : "포기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    );
  }

  // ── Normal view (no active session) ──────────────────────────
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <p className="text-muted-foreground">
            프리셋 기반으로 포트폴리오를 리밸런싱하세요.
          </p>
        </div>

        {/* Compact portfolio summary */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm px-1">
          <span>
            <span className="text-muted-foreground">총 자산</span>{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(totalValue)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">예수금</span>{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(cashAmount)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">보유</span>{" "}
            <span className="font-semibold">{manualStocks.length}종목</span>
          </span>
        </div>

        {/* Deleted preset warning */}
        {presetDeleted && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-50 p-4 dark:bg-orange-950/30">
            <AlertTriangle className="size-5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="font-medium">이전 프리셋이 삭제되었습니다</p>
              <p>현재 설정된 비중은 그대로 유지됩니다. 새 프리셋을 선택하거나 직접 비중을 조정하세요.</p>
            </div>
          </div>
        )}

        {!hasTargets && !activePresetId ? (
          /* ── State A: No preset, no targets → prompt ── */
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <FolderInput className="size-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">프리셋을 선택해주세요</p>
                <p className="text-sm text-muted-foreground mt-1">
                  저장된 프리셋을 적용하여 목표 비중을 설정하세요.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPresetSelectorOpen(true)}>
                  <FolderInput className="size-4" />
                  프리셋 선택
                </Button>
                <Button variant="outline" onClick={() => setPresetManagerOpen(true)}>
                  프리셋 관리
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── State B: Has targets → full rebalancing view ── */
          <>
            {/* Preset info card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    {activePreset ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{activePreset.name}</CardTitle>
                          {isTargetModified && (
                            <Badge variant="secondary" className="text-xs">수정됨</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {activePreset.targets.length}개 종목 · 비중 합계{" "}
                          {activePreset.targets.reduce((s, t) => s + t.target_pct, 0).toFixed(1)}%
                        </CardDescription>
                      </>
                    ) : (
                      <>
                        <CardTitle className="text-lg">수동 비중 설정</CardTitle>
                        <CardDescription>
                          프리셋 없이 직접 설정한 비중입니다.
                        </CardDescription>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPresetSelectorOpen(true)}
                      className="shrink-0"
                    >
                      <FolderInput className="size-4" />
                      {activePreset ? "프리셋 변경" : "프리셋 선택"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPresetManagerOpen(true)}
                      className="shrink-0"
                    >
                      관리
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Re-apply banner when targets modified */}
            {activePreset && isTargetModified && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-500/50 bg-blue-50 p-3 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <RefreshCw className="size-4 shrink-0" />
                  <span>비중이 프리셋과 다릅니다.</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReapplyPreset}
                  disabled={isApplying}
                  className="shrink-0"
                >
                  {isApplying ? "적용 중..." : "다시 적용"}
                </Button>
              </div>
            )}

            {/* Current vs Target comparison (read-only, compact) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">현재 vs 목표 비중</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Header row */}
                <div className="hidden sm:flex items-center text-xs text-muted-foreground pb-2 border-b mb-1">
                  <span className="flex-1">종목</span>
                  <span className="w-16 text-right">현재</span>
                  <span className="w-6 text-center" />
                  <span className="w-16 text-right">목표</span>
                  <span className="w-16 text-right">차이</span>
                </div>
                <div className="space-y-0.5">
                  {comparisonData.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between sm:justify-start text-sm py-1.5"
                    >
                      <span className="font-medium truncate flex-1 min-w-0 pr-2">
                        {stock.stock_name}
                      </span>
                      <div className="flex items-center gap-0 tabular-nums shrink-0">
                        <span className="text-muted-foreground w-16 text-right">
                          {stock.currentPct.toFixed(1)}%
                        </span>
                        <span className="w-6 text-center text-muted-foreground">→</span>
                        <span className="font-medium w-16 text-right">
                          {stock.targetPct.toFixed(1)}%
                        </span>
                        <span
                          className={cn(
                            "w-16 text-right",
                            stock.diff > 0.1 && "text-blue-600 dark:text-blue-400",
                            stock.diff < -0.1 && "text-red-600 dark:text-red-400",
                          )}
                        >
                          {stock.diff > 0 ? "+" : ""}
                          {stock.diff.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Cash row */}
                  <div className="flex items-center justify-between sm:justify-start text-sm py-1.5 border-t mt-1 pt-2">
                    <span className="font-medium flex-1">현금</span>
                    <div className="flex items-center gap-0 tabular-nums shrink-0">
                      <span className="text-muted-foreground w-16 text-right">
                        {cashCurrentPct.toFixed(1)}%
                      </span>
                      <span className="w-6 text-center text-muted-foreground">→</span>
                      <span className="font-medium w-16 text-right">
                        {cashTargetPct.toFixed(1)}%
                      </span>
                      <span
                        className={cn(
                          "w-16 text-right",
                          cashDiff > 0.1 && "text-blue-600 dark:text-blue-400",
                          cashDiff < -0.1 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {cashDiff > 0 ? "+" : ""}
                        {cashDiff.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main CTA */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleStartRebalancing}
                disabled={!canSimulate || isStarting || isLoadingSession}
                size="lg"
              >
                {isStarting ? "시작 중..." : "리밸런싱 실행"}
              </Button>
              {!canSimulate && hasStocks && (
                <p className="text-xs text-muted-foreground">
                  목표 비중을 먼저 설정하고 저장해주세요.
                </p>
              )}
            </div>

            {/* Collapsible target weight editor */}
            <Card>
              <CardHeader className="pb-0">
                <button
                  type="button"
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setShowEditor((v) => !v)}
                >
                  <div className="space-y-1">
                    <CardTitle className="text-base">세부 비중 조정</CardTitle>
                    <CardDescription>
                      각 종목의 목표 비중을 직접 수정합니다.
                    </CardDescription>
                  </div>
                  {showEditor ? (
                    <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                  )}
                </button>
              </CardHeader>
              {showEditor && (
                <CardContent className="pt-4">
                  <TargetWeightEditor
                    key={editorKey}
                    stocks={manualStocks}
                    cashAmount={cashAmount}
                    exchangeRate={exchangeRate}
                    onSave={handleSaveTargets}
                    isSaving={isSavingTargets}
                  />
                </CardContent>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Preset selector dialog */}
      <PresetSelector
        open={presetSelectorOpen}
        onOpenChange={setPresetSelectorOpen}
        onApply={handleApplyPreset}
        isApplying={isApplying}
        portfolioStockCodes={portfolioStockCodes}
      />

      {/* Preset manager dialog */}
      <PresetManager
        open={presetManagerOpen}
        onOpenChange={setPresetManagerOpen}
        onApplyPreset={handleApplyPreset}
        isApplying={isApplying}
        portfolioId={portfolioId}
      />
    </PageTransition>
  );
}
