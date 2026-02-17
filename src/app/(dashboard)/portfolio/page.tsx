"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { useSubscription } from "@/hooks/use-subscription";
import { useRefreshPrices } from "@/hooks/use-refresh-prices";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { SummaryCards } from "@/components/portfolio/summary-cards";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { StockTable } from "@/components/manual-portfolio/stock-table";
import { PortfolioEditSection } from "@/components/portfolio/portfolio-edit-section";

import { TargetWeightEditor } from "@/components/rebalance/target-weight-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/use-accounts";
import { useConsolidatedPortfolio } from "@/hooks/use-consolidated-portfolio";
import { AccountTabs } from "@/components/account/account-tabs";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

function formatUpdatedAt(timestamp: number | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function PortfolioPage() {
  const { accounts, selectedAccountId, isLoading: isAccountsLoading } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const isAllMode = selectedAccountId === "all";

  // 계좌 1개 + 전체 모드: 해당 계좌를 실질적으로 사용 (편집/리밸런싱 가능)
  const effectivePortfolioId = isAllMode && accounts.length === 1 ? accounts[0].id : portfolioId;
  const effectiveIsAllMode = isAllMode && accounts.length > 1;

  const { isPro } = useSubscription();
  const { refreshPrices, isRefreshing } = useRefreshPrices(effectivePortfolioId ?? undefined);
  const { rate: exchangeRate } = useExchangeRate();
  const {
    portfolio,
    stocks,
    balance,
    isLoading,
    setCash,
    addStock,
    updateStock,
    deleteStock,
    isAdding,
    dataUpdatedAt,
    refetch,
    isFetching,
    updateBatchTargets,
    isCashSaving,
  } = useManualPortfolio(effectivePortfolioId, exchangeRate);
  const {
    balance: consolidatedBalance,
    isLoading: isConsolidatedLoading,
  } = useConsolidatedPortfolio();

  const [isSavingTargets, setIsSavingTargets] = useState(false);

  function handleRefreshPrices() {
    refreshPrices(undefined, {
      onSuccess: (result) => {
        if (result.failed === 0) {
          toast.success(`${result.updated}개 종목 가격이 업데이트되었습니다.`);
        } else if (result.updated > 0) {
          toast.warning(`${result.updated}개 성공, ${result.failed}개 실패`);
        } else {
          toast.error("가격 업데이트에 실패했습니다.");
        }
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  // 모든 derived state / useMemo를 early return 전에 배치 (Rules of Hooks)
  const totalValue = balance?.total_value ?? 0;
  const totalProfitLoss = balance?.total_profit_loss ?? 0;
  const totalProfitRate = balance?.total_profit_rate ?? 0;
  const cash = Number(portfolio?.cash ?? 0);

  function handleDeleteStock(id: string) {
    const stock = stocks.find((s) => s.id === id);
    deleteStock(id);
    toast.success(`${stock?.stock_name ?? "종목"}이 삭제되었습니다.`);
  }

  function handleSaveTargets(updates: { id: string; targetPct: number }[]) {
    setIsSavingTargets(true);
    updateBatchTargets(updates, {
      onSuccess: () => {
        toast.success("목표 비중이 저장되었습니다.");
        setIsSavingTargets(false);
      },
      onError: (error) => {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        toast.error(`목표 비중 저장에 실패했습니다: ${msg}`);
        setIsSavingTargets(false);
      },
    });
  }

  if (effectiveIsAllMode ? isConsolidatedLoading : isLoading) {
    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            내 포트폴리오
          </h1>
          <div className="space-y-3">
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // No accounts: prompt to create first account
  if (!isAccountsLoading && accounts.length === 0) {
    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              포트폴리오를 시작하려면 계좌를 추가해주세요.
            </p>
          </div>
          <Card className="flex flex-col items-center justify-center gap-3 p-8">
            <p className="text-muted-foreground text-lg">
              아직 계좌가 없습니다.
            </p>
            <p className="text-muted-foreground text-sm">
              상단의 &quot;계좌 추가&quot; 버튼을 눌러 첫 번째 계좌를 만들어보세요.
            </p>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // Consolidated "all accounts" view (only for 2+ accounts)
  if (effectiveIsAllMode) {
    const allTotalValue = consolidatedBalance?.total_value ?? 0;
    const allProfitLoss = consolidatedBalance?.total_profit_loss ?? 0;
    const allProfitRate = consolidatedBalance?.total_profit_rate ?? 0;
    const allCash = consolidatedBalance?.cash ?? 0;
    const allStocks = consolidatedBalance?.stocks ?? [];

    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              모든 계좌의 자산을 통합하여 표시합니다.
            </p>
          </div>

          <AccountTabs />

          <SummaryCards
            totalValue={allTotalValue}
            totalProfitLoss={allProfitLoss}
            totalProfitRate={allProfitRate}
            cash={allCash}
            stockCount={allStocks.length}
            isLoading={false}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardContent>
                <AllocationChart
                  stocks={allStocks}
                  cash={allCash}
                  totalValue={allTotalValue}
                  isLoading={false}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent>
                {allStocks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    보유 종목이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {allStocks.map((stock) => (
                      <div
                        key={stock.stock_code}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {stock.stock_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stock.stock_code} ·{" "}
                            {stock.quantity.toLocaleString("ko-KR")}주
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm tabular-nums">
                            {formatCurrency(stock.eval_amount)}
                          </div>
                          <div
                            className={cn(
                              "text-xs tabular-nums",
                              stock.profit_rate > 0 && "profit-up",
                              stock.profit_rate < 0 && "profit-down",
                            )}
                          >
                            {stock.profit_rate > 0 ? "+" : ""}
                            {stock.profit_rate.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="hidden md:block">
            <Button asChild size="lg">
              <Link href="/rebalance">리밸런싱으로 이동</Link>
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Empty state: show centered prompt with form expanded
  if (stocks.length === 0) {
    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              보유 자산과 현재 비중을 확인하고 관리합니다.
            </p>
          </div>

          <AccountTabs />

          <SummaryCards
            totalValue={totalValue}
            totalProfitLoss={totalProfitLoss}
            totalProfitRate={totalProfitRate}
            cash={cash}
            stockCount={0}
            isLoading={isLoading}
            onCashChange={setCash}
            isCashSaving={isCashSaving}
          />

          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-muted-foreground mb-4">
                포트폴리오에 종목을 추가해주세요.
              </p>
              <PortfolioEditSection
                portfolio={portfolio}
                stocks={stocks}
                onAddStock={addStock}
                isAdding={isAdding}
                defaultExpanded={true}
              />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dataUpdatedAt > 0 ? (
                <span>마지막 갱신: {formatUpdatedAt(dataUpdatedAt)}</span>
              ) : (
                <span>보유 자산을 관리하세요</span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full hover:bg-muted"
          >
            <RefreshCw className={isFetching ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
          </Button>
        </div>

        <AccountTabs />

        {/* Summary Cards */}
        <SummaryCards
          totalValue={totalValue}
          totalProfitLoss={totalProfitLoss}
          totalProfitRate={totalProfitRate}
          cash={cash}
          stockCount={stocks.length}
          isLoading={isLoading}
          onCashChange={setCash}
          isCashSaving={isCashSaving}
        />

        {/* Assets & Allocation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Stock List Area */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-base font-semibold">보유 종목</h3>
            </div>

            <StockTable
              stocks={stocks}
              onUpdate={updateStock}
              onDelete={handleDeleteStock}
              onRefresh={isPro ? handleRefreshPrices : undefined}
              isRefreshing={isRefreshing}
              exchangeRate={exchangeRate}
              totalPortfolioValue={totalValue}
            />
          </div>

          {/* Side Panel: Allocation Chart */}
          <div className="lg:col-span-1 order-1 lg:order-2 mb-4 lg:mb-0">
             <div className="sticky top-20">
              <h3 className="text-base font-semibold mb-2 px-1">자산 배분</h3>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <AllocationChart
                  stocks={balance?.stocks ?? []}
                  cash={cash}
                  totalValue={totalValue}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 인라인 목표 비중 편집기 (TargetWeightEditor) */}
        <TargetWeightEditor
          mode="inline"
          stocks={stocks}
          cashAmount={cash}
          exchangeRate={exchangeRate ?? 1}
          onSave={handleSaveTargets}
          isSaving={isSavingTargets}
        />

        {/* Portfolio Edit Section (Collapsible) */}
        <PortfolioEditSection
          portfolio={portfolio}
          stocks={stocks}
          onAddStock={addStock}
          isAdding={isAdding}
          onRefreshPrices={isPro ? handleRefreshPrices : undefined}
          isRefreshing={isRefreshing}
          defaultExpanded={false}
        />

        {/* Sticky Bottom CTA - Mobile Only */}
        <div className="fixed bottom-16 left-0 right-0 md:hidden bg-background border-t border-border p-3 z-10">
          <Button asChild className="w-full" size="lg">
            <Link href="/rebalance">리밸런싱으로 이동</Link>
          </Button>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button asChild size="lg">
            <Link href="/rebalance">리밸런싱으로 이동</Link>
          </Button>
        </div>
      </div>

    </PageTransition>
  );
}
