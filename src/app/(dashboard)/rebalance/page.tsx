"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, RefreshCw } from "lucide-react";
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <div className="space-y-4">
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <AccountTabs />
          <Card className="border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <p className="text-muted-foreground">
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <Card className="border-border/50 shadow-sm">
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
        <div className="space-y-6">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <AccountTabs />
          <Card className="border-border/50 shadow-sm">
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
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            리밸런싱
          </h1>
          <p className="text-muted-foreground">
            목표 비중 기반으로 포트폴리오를 리밸런싱하세요.
          </p>
        </div>

        <AccountTabs />

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

        {!hasTargets ? (
          /* No targets set → direct to portfolio page */
          <Card className="border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <div className="text-center">
                <p className="font-medium">목표 비중이 설정되지 않았습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  포트폴리오 페이지에서 각 종목의 목표 비중을 설정해주세요.
                </p>
              </div>
              <Button asChild>
                <Link href="/portfolio">포트폴리오에서 비중 설정</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Has targets → rebalancing view */
          <>
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
                  포트폴리오 데이터를 불러오는 중입니다.
                </p>
              )}
            </div>

            {/* Link to edit targets on portfolio page */}
            <p className="text-sm text-muted-foreground px-1">
              목표 비중을 수정하려면{" "}
              <Link href="/portfolio" className="text-primary underline underline-offset-4 hover:text-primary/80">
                포트폴리오 페이지
              </Link>
              에서 변경하세요.
            </p>
          </>
        )}
      </div>
    </PageTransition>
  );
}
