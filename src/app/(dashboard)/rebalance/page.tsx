"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RefreshCw,
  History,
  Wallet,
  AlertCircle,
  PieChart,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAccounts } from "@/hooks/use-accounts";
import { AccountTabs } from "@/components/account/account-tabs";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import { toPortfolioItems } from "@/lib/rebalance/helpers";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/layout/page-transition";
import { ActiveSessionView } from "@/components/rebalance/active-session-view";

export default function RebalancePage() {
  const { accounts, selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const isAllMode = selectedAccountId === "all";

  // 계좌 1개 + 전체 모드: 해당 계좌를 실질적으로 사용 (리밸런싱 가능)
  const effectivePortfolioId = isAllMode && accounts.length === 1 ? accounts[0].id : portfolioId;
  const effectiveIsAllMode = isAllMode && accounts.length > 1;
  const effectiveAccountName = accounts.find(a => a.id === effectivePortfolioId)?.name ?? null;

  const {
    data: balance,
    isLoading,
    isError,
    error,
    targets,
    exchangeRate,
  } = usePortfolioData(effectivePortfolioId);
  const {
    stocks: manualStocks,
    portfolio,
    isLoading: isManualLoading,
  } = useManualPortfolio(effectivePortfolioId, exchangeRate);
  const {
    activeSession,
    isLoadingSession,
    refetchActiveSession,
    startSession,
    updateOrderQuantity,
    pendingOrders,
    batchFillOrders,
    completeSession,
    abandonSession,
    recalculateRemaining,
    resumeSession,
    latestPartialSession,
    getProgress,
    lastSavedAt,
    isSaving,
    isStarting,
    isCompleting,
    isAbandoning,
    isRecalculating,
    isResuming,
  } = useProgressiveRebalance(effectivePortfolioId);

  const cashAmount = Number(portfolio?.cash ?? 0);
  const totalValue = balance?.total_value ?? 0;

  const hasStocks = manualStocks.length > 0;
  const hasTargets = targets.some((t) => !t.is_cash && t.target_pct > 0);
  const canSimulate = hasStocks && hasTargets && !!balance;
  const hasActiveSession = !!activeSession;

  // Stock currencies map for session start
  const stockCurrencies = useMemo(
    () => new Map(manualStocks.map((s) => [s.stock_code, s.currency ?? "KRW"])),
    [manualStocks],
  );

  // Target percentages merged into manualStocks for ActiveSessionView
  const manualStocksForSession = useMemo(
    () =>
      manualStocks.map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        current_price: s.current_price,
        currency: s.currency,
        target_pct: targets.find((t) => t.stock_code === s.stock_code)?.target_pct ?? 0,
      })),
    [manualStocks, targets],
  );

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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              리밸런싱
            </h1>
            <Link
              href="/history"
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <History size={20} />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="h-40 skeleton-shimmer rounded-3xl bg-muted" />
            <div className="h-12 skeleton-shimmer rounded-xl bg-muted" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Must select specific account for rebalancing (2+ accounts only)
  if (effectiveIsAllMode) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              리밸런싱
            </h1>
            <Link
              href="/history"
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <History size={20} />
            </Link>
          </div>
          <AccountTabs />
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <p className="font-medium">
                리밸런싱을 실행하려면 특정 계좌를 선택해주세요.
              </p>
              <p className="text-sm text-muted-foreground">
                위 탭에서 개별 계좌를 선택하세요.
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              리밸런싱
            </h1>
            <Link
              href="/history"
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <History size={20} />
            </Link>
          </div>
          <AccountTabs />
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <p className="text-destructive font-medium">
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              리밸런싱
            </h1>
            <Link
              href="/history"
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <History size={20} />
            </Link>
          </div>
          <AccountTabs />
          <div className="rounded-2xl p-6 border border-dashed border-border bg-muted/30 text-center">
            <div className="mx-auto bg-card w-12 h-12 rounded-full flex items-center justify-center shadow-sm text-muted-foreground mb-3">
              <PlusCircle size={24} />
            </div>
            <h3 className="font-bold mb-1">보유 종목이 없어요</h3>
            <p className="text-sm text-muted-foreground mb-4">
              리밸런싱을 하려면 포트폴리오를 구성해야 해요.
            </p>
            <Link
              href="/portfolio"
              className="text-primary font-medium text-sm hover:underline inline-flex items-center gap-1"
            >
              포트폴리오 구성하러 가기 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Active session view ──────────────────────────────────────
  if (hasActiveSession) {
    return (
      <PageTransition>
        <ActiveSessionView
          session={activeSession}
          accountName={effectiveAccountName}
          manualStocks={manualStocksForSession}
          exchangeRate={exchangeRate}
          updateOrderQuantity={updateOrderQuantity}
          pendingOrders={pendingOrders}
          batchFillOrders={batchFillOrders}
          completeSession={completeSession}
          abandonSession={abandonSession}
          recalculateRemaining={recalculateRemaining}
          getProgress={getProgress}
          lastSavedAt={lastSavedAt}
          isSaving={isSaving}
          isCompleting={isCompleting}
          isAbandoning={isAbandoning}
          isRecalculating={isRecalculating}
        />
      </PageTransition>
    );
  }

  // ── Normal view (no active session) ──────────────────────────
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <Link
            href="/history"
            className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
          >
            <History size={20} />
          </Link>
        </div>

        <AccountTabs />

        {/* Portfolio Summary Card */}
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="text-primary" size={20} />
              <span className="text-muted-foreground font-medium text-sm">
                {effectiveAccountName ?? "포트폴리오"} 요약
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">총 자산 평가액</p>
                <h2 className="text-3xl font-bold tracking-tight">
                  {Math.round(totalValue).toLocaleString("ko-KR")}
                  <span className="text-lg font-normal text-muted-foreground ml-1">원</span>
                </h2>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border/50">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">예수금 (가용현금)</p>
                  <p className="font-semibold text-lg tabular-nums">{formatCurrency(cashAmount)}</p>
                </div>
                <div className="flex-1 border-l border-border/50 pl-4">
                  <p className="text-xs text-muted-foreground mb-1">보유 종목 수</p>
                  <p className="font-semibold text-lg">{manualStocks.length}종목</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume partial session banner */}
        {latestPartialSession && (
          <div className="rounded-2xl p-5 bg-primary/10 border border-primary/20 flex items-start gap-4 relative overflow-hidden">
            <div className="bg-card p-2 rounded-full shadow-sm z-10 text-primary">
              <RefreshCw size={20} />
            </div>
            <div className="z-10 flex-1 space-y-2">
              <h3 className="font-bold text-sm">부분완료된 세션이 있습니다</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {latestPartialSession.preset_name
                  ? `${latestPartialSession.preset_name} · `
                  : ""}
                {getProgress(latestPartialSession.orders).completed}/
                {getProgress(latestPartialSession.orders).total}개 체결 완료
                {latestPartialSession.completed_at &&
                  ` · ${formatDistanceToNow(new Date(latestPartialSession.completed_at), { locale: ko, addSuffix: true })}`}
              </p>
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

        {!hasTargets ? (
          /* No targets set → warning banner */
          <div className="rounded-2xl p-5 bg-warning/10 border border-warning/20 flex items-start gap-3">
            <AlertCircle className="text-warning shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-sm mb-1">목표 비중이 설정되지 않았어요</h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                각 종목의 목표 비중을 설정하면 리밸런싱을 실행할 수 있습니다.
              </p>
              <Link
                href="/portfolio"
                className="inline-block bg-warning/20 hover:bg-warning/30 text-foreground rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                목표 비중 설정하기
              </Link>
            </div>
          </div>
        ) : (
          /* Has targets → rebalancing CTA */
          <div className="space-y-4 pt-2">
            <button
              onClick={handleStartRebalancing}
              disabled={!canSimulate || isStarting || isLoadingSession}
              className={cn(
                "w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                !canSimulate || isStarting || isLoadingSession
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-foreground text-background hover:bg-foreground/90 shadow-md",
              )}
            >
              <RefreshCw className={cn("size-5", isStarting && "animate-spin")} />
              {isStarting ? "시작 중..." : "리밸런싱 실행"}
            </button>

            <div className="text-center">
              <Link
                href="/portfolio"
                className="text-muted-foreground text-sm font-medium hover:text-foreground inline-flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <PieChart size={16} />
                목표 비중 편집
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
