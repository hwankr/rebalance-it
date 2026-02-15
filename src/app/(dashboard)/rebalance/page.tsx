"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { useRebalanceSettings } from "@/hooks/use-rebalance-settings";
import { useHistory } from "@/hooks/use-history";
import { useAuth } from "@/hooks/use-auth";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import { toPortfolioItems } from "@/lib/rebalance/helpers";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageTransition } from "@/components/layout/page-transition";
import { TargetWeightEditor } from "@/components/rebalance/target-weight-editor";
import { SimulationResultSection } from "@/components/rebalance/simulation-result-section";
import { TradeGuideSection } from "@/components/rebalance/trade-guide-section";

type SimulationResult = ReturnType<typeof simulateRebalance>;

export default function RebalancePage() {
  const { user } = useAuth();
  const {
    data: balance,
    isLoading,
    isError,
    error,
    targets,
    exchangeRate,
  } = usePortfolioData();
  const {
    stocks: manualStocks,
    portfolio,
    updateBatchTargets,
    isLoading: isManualLoading,
  } = useManualPortfolio(exchangeRate);
  const { settings: rebalanceSettings } = useRebalanceSettings();
  const { addExecution } = useHistory();

  const threshold = rebalanceSettings?.threshold_pct ?? 5;

  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  const cashAmount = Number(portfolio?.cash ?? 0);
  const totalValue = balance?.total_value ?? 0;

  // 시뮬레이션에 사용할 수 있는지 확인
  const hasStocks = manualStocks.length > 0;
  const hasTargets = targets.some((t) => !t.is_cash && t.target_pct > 0);
  const canSimulate = hasStocks && hasTargets && !!balance;

  function handleSimulate() {
    if (!balance) return;

    const portfolioItems = toPortfolioItems(balance.stocks, targets, cashAmount);
    const result = simulateRebalance(portfolioItems, targets);
    setSimulationResult(result);
    setSaved(false);
  }

  function handleSaveTargets(updates: { id: string; targetPct: number }[]) {
    setIsSavingTargets(true);
    updateBatchTargets(updates, {
      onSuccess: () => {
        setSimulationResult(null);
        setSaved(false);
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

  function handleSaveToHistory() {
    if (!simulationResult || !user) return;

    addExecution({
      profile_id: "",
      profile_name: "리밸런싱",
      preset_name: "리밸런싱",
      status: "completed",
      total_orders: simulationResult.orders.length,
      success_count: simulationResult.orders.length,
      fail_count: 0,
      total_buy_amount: simulationResult.total_buy_amount,
      total_sell_amount: simulationResult.total_sell_amount,
      net_cash_change: simulationResult.net_cash_change,
      orders: simulationResult.orders.map((o) => ({
        ...o,
        success: true,
      })),
    });

    setSaved(true);
    toast.success("시뮬레이션 기록이 저장되었습니다.");
  }

  // 로딩 상태
  if (isLoading || isManualLoading) {
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

  // 에러 상태
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

  // 포트폴리오 없음
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
                <Link href="/manual-portfolio">포트폴리오 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱
          </h1>
          <p className="text-muted-foreground">
            목표 비중을 설정하고 리밸런싱 시뮬레이션을 실행하세요.
          </p>
        </div>

        {/* 섹션 1: 포트폴리오 요약 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardHeader>
              <CardDescription>총 자산</CardDescription>
              <CardTitle className="text-2xl tabular-nums font-mono">
                {formatCurrency(totalValue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardDescription>예수금 (현금)</CardDescription>
              <CardTitle className="text-2xl tabular-nums font-mono">
                {formatCurrency(cashAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardDescription>보유 종목 수</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {manualStocks.length}종목
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 섹션 2: 목표 비중 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>목표 비중 설정</CardTitle>
            <CardDescription>
              각 종목의 목표 비중을 설정하세요. 현금 비중은 나머지로 자동
              계산됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TargetWeightEditor
              stocks={manualStocks}
              cashAmount={cashAmount}
              exchangeRate={exchangeRate}
              onSave={handleSaveTargets}
              isSaving={isSavingTargets}
            />
          </CardContent>
        </Card>

        {/* 섹션 3: 시뮬레이션 실행 */}
        <Card>
          <CardHeader>
            <CardTitle>시뮬레이션</CardTitle>
            <CardDescription>
              설정한 목표 비중을 기반으로 리밸런싱을 시뮬레이션합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button onClick={handleSimulate} disabled={!canSimulate}>
                시뮬레이션 실행
              </Button>
              {simulationResult && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSimulationResult(null);
                    setSaved(false);
                  }}
                >
                  초기화
                </Button>
              )}
            </div>
            {!canSimulate && hasStocks && (
              <p className="mt-2 text-xs text-muted-foreground">
                목표 비중을 먼저 설정하고 저장해주세요.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 섹션 4: 시뮬레이션 결과 */}
        {simulationResult && (
          <SimulationResultSection
            result={simulationResult}
            threshold={threshold}
          />
        )}

        {/* 섹션 5: 매매 가이드 */}
        {simulationResult && simulationResult.orders.length > 0 && (
          <TradeGuideSection
            orders={simulationResult.orders}
            totalBuyAmount={simulationResult.total_buy_amount}
            totalSellAmount={simulationResult.total_sell_amount}
            netCashChange={simulationResult.net_cash_change}
            onSaveToHistory={user ? handleSaveToHistory : undefined}
            isSaved={saved}
          />
        )}
      </div>
    </PageTransition>
  );
}
