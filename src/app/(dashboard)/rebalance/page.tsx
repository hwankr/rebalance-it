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
import { PRICE_CHANGE_THRESHOLD } from "@/lib/rebalance/constants";

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
    recalculateRemaining,
    resumeSession,
    latestPartialSession,
    getProgress,
    isStarting,
    isCompleting,
    isAbandoning,
    isRecalculating,
    isResuming,
  } = useProgressiveRebalance(portfolioId);

  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);
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

  // Stock currencies map for session start
  const stockCurrencies = useMemo(
    () => new Map(manualStocks.map((s) => [s.stock_code, s.currency ?? "KRW"])),
    [manualStocks],
  );

  // Price change detection: compare session snapshot prices vs current manual_stocks prices
  // Note: snapshot prices are KRW-normalized (from balance.stocks which applies exchangeRate)
  // manualStocks.current_price is in native currency (USD for US stocks)
  // recalculated_prices are also in native currency (from fetchStockPrice)
  const priceChanges = useMemo(() => {
    if (!activeSession?.portfolio_snapshot) return [];
    const snapshot = activeSession.portfolio_snapshot;
    const refPrices = activeSession.recalculated_prices;
    const changes: Array<{
      stock_code: string;
      stock_name: string;
      refPrice: number;
      currentPrice: number;
      changePct: number;
    }> = [];
    for (const snapStock of snapshot.stocks) {
      const current = manualStocks.find((s) => s.stock_code === snapStock.stock_code);
      if (!current) continue;
      const isUsd = current.currency === "USD";
      // Normalize current price to KRW (to match snapshot which is KRW-normalized)
      const currentPriceKrw = isUsd ? current.current_price * exchangeRate : current.current_price;
      // recalculated_prices are in native currency, snapshot.price is already KRW
      const recalcNative = refPrices?.[snapStock.stock_code];
      const refPrice = recalcNative != null
        ? (isUsd ? recalcNative * exchangeRate : recalcNative)
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
  }, [activeSession, manualStocks, exchangeRate]);

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
        stockCurrencies,
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

  function handleQuantityChange(stockCode: string, executedQuantity: number, actualPrice?: number) {
    if (!activeSession) return;
    updateOrderQuantity(activeSession.id, stockCode, executedQuantity, actualPrice);
  }

  async function handleRecalculate() {
    if (!activeSession) return;
    try {
      await recalculateRemaining(activeSession.id);
      setRecalcOpen(false);
      toast.success("잔여 주문이 현재 시세 기준으로 재계산되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`재계산에 실패했습니다: ${msg}`);
    }
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

  async function handleResumePartial() {
    if (!latestPartialSession) return;
    try {
      await resumeSession(latestPartialSession.id);
      toast.success("부분완료 세션을 이어서 진행합니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`세션 재개에 실패했습니다: ${msg}`);
    }
  }

  // Loading (wait for session check too, to avoid showing button when stale session exists)
  if (isLoading || isManualLoading || isLoadingSession) {
    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
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
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
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
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
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
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
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
        <div className="space-y-3 md:space-y-4">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0.5 h-6">
                진행중
              </Badge>
              <h1 className="text-lg font-bold tracking-tight">
                리밸런싱 실행
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              증권사 앱에서 주문을 실행하고, 실제 체결 수량을 입력하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main Content: Orders */}
            <div className="lg:col-span-8 space-y-4">
              {/* Step indicator */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                 <RebalanceStepper
                   currentPhase={currentPhase}
                   hasSellOrders={sellOrders.length > 0}
                 />
              </div>

              {/* Price change warning banner */}
              {priceChanges.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-50/50 p-4 dark:bg-orange-950/20">
                  <AlertTriangle className="size-5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
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
                        미체결 주문의 수량이 현재 시세와 맞지 않을 수 있습니다. 재계산을 권장합니다.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecalcOpen(true)}
                      disabled={isRecalculating}
                      className="gap-1.5 h-7 text-xs bg-transparent border-orange-200 hover:bg-orange-100 dark:border-orange-800 dark:hover:bg-orange-900/50"
                    >
                      <RefreshCw className={cn("size-3", isRecalculating && "animate-spin")} />
                      {isRecalculating ? "재계산 중..." : "잔여 주문 재계산"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Sell orders */}
              {sellOrders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center size-6 rounded-full bg-red-100 text-red-700 text-xs font-bold dark:bg-red-900/30 dark:text-red-400">1</span>
                    매도 주문
                  </h3>
                   <ProgressiveOrderList
                    orders={activeSession.orders}
                    side="sell"
                    stepNumber={1}
                    onQuantityChange={handleQuantityChange}
                    onBatchFill={handleBatchFillSell}
                    disabled={false}
                  />
                </div>
              )}

              {/* Buy orders */}
              {buyOrders.length > 0 && (
                <div className="space-y-4">
                   <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center size-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold dark:bg-blue-900/30 dark:text-blue-400">
                      {sellOrders.length > 0 ? 2 : 1}
                    </span>
                    매수 주문
                  </h3>
                  <ProgressiveOrderList
                    orders={activeSession.orders}
                    side="buy"
                    stepNumber={sellOrders.length > 0 ? 2 : 1}
                    onQuantityChange={handleQuantityChange}
                    onBatchFill={handleBatchFillBuy}
                    disabled={false}
                  />
                </div>
              )}
            </div>

            {/* Sidebar: Progress & Actions */}
            <div className="lg:col-span-4 space-y-4">
              <div className="sticky top-20 space-y-4">
                 <ProgressSummary
                  orders={activeSession.orders}
                  totalBuyAmount={activeSession.total_buy_amount}
                  totalSellAmount={activeSession.total_sell_amount}
                />

                <div className="flex flex-col gap-3">
                  <Button onClick={() => setCompleteOpen(true)} className="w-full gap-2 h-12 text-base shadow-md">
                    <CheckCircle2 className="size-5" />
                    리밸런싱 완료
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setRecalcOpen(true)}
                      disabled={isRecalculating}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("size-4", isRecalculating && "animate-spin")} />
                      재계산
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAbandonOpen(true)}
                      className="gap-2 hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-destructive/80"
                    >
                      <XCircle className="size-4" />
                      포기
                    </Button>
                  </div>
                </div>

                {/* Stale warning */}
                {isStale && (
                  <div className="rounded-lg border border-orange-500/20 bg-orange-50/50 p-4 dark:bg-orange-950/10 text-xs text-orange-800 dark:text-orange-300">
                    <p className="font-medium mb-1 flex items-center gap-1.5">
                       <Clock className="size-3.5" /> 오래된 세션
                    </p>
                    <p className="opacity-90">
                      시작된 지 {startedAt && formatDistanceToNow(startedAt, { locale: ko, addSuffix: false })} 경과.
                    </p>
                  </div>
                )}
              </div>
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

        {/* Recalculate confirmation dialog */}
        <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>잔여 주문 재계산</DialogTitle>
              <DialogDescription>
                현재 시세를 기준으로 미체결 주문의 수량을 다시 계산합니다.
                이미 체결된 주문은 유지됩니다.
              </DialogDescription>
            </DialogHeader>
            {priceChanges.length > 0 && (
              <div className="text-sm space-y-1 rounded-lg border p-3 bg-muted/50">
                <p className="font-medium text-muted-foreground">변동 감지 종목:</p>
                {priceChanges.map((pc) => (
                  <div key={pc.stock_code} className="flex justify-between">
                    <span>{pc.stock_name}</span>
                    <span className={cn(
                      "tabular-nums font-medium",
                      pc.changePct > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400",
                    )}>
                      {pc.changePct > 0 ? "+" : ""}
                      {(pc.changePct * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="gap-2"
              >
                <RefreshCw className={cn("size-4", isRecalculating && "animate-spin")} />
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
      </div>
      </PageTransition>
    );
  }

  // ── Normal view (no active session) ──────────────────────────
  return (
    <PageTransition>
      <div className="space-y-3 md:space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
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

        {/* Resume partial session banner */}
        {latestPartialSession && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-500/50 bg-blue-50 p-4 dark:bg-blue-950/30">
            <Clock className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">부분완료된 세션이 있습니다</p>
                <p>
                  {latestPartialSession.preset_name
                    ? `${latestPartialSession.preset_name} · `
                    : ""}
                  {getProgress(latestPartialSession.orders).completed}/
                  {getProgress(latestPartialSession.orders).total}개 체결 완료
                  {latestPartialSession.completed_at &&
                    ` · ${formatDistanceToNow(new Date(latestPartialSession.completed_at), { locale: ko, addSuffix: true })}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResumePartial}
                disabled={isResuming}
                className="gap-1.5"
              >
                <RefreshCw className={cn("size-3.5", isResuming && "animate-spin")} />
                {isResuming ? "재개 중..." : "이어서 진행"}
              </Button>
            </div>
          </div>
        )}

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
            <CardContent className="flex flex-col items-center gap-3 py-6">
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
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    {activePreset ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{activePreset.name}</CardTitle>
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
                        <CardTitle className="text-base">수동 비중 설정</CardTitle>
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
