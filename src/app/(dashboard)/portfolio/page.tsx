"use client";

import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { useManualPortfolio, type ManualStockInput } from "@/hooks/use-manual-portfolio";
import { useSubscription } from "@/hooks/use-subscription";
import { useRefreshPrices } from "@/hooks/use-refresh-prices";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { PortfolioHero } from "@/components/portfolio/portfolio-hero";
import { RebalanceSummaryCards } from "@/components/portfolio/rebalance-summary-cards";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { StockTable } from "@/components/manual-portfolio/stock-table";

import { TargetWeightEditor } from "@/components/rebalance/target-weight-editor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/use-accounts";
import { useConsolidatedPortfolio } from "@/hooks/use-consolidated-portfolio";
import { AccountTabs } from "@/components/account/account-tabs";
import { ConsolidatedFilterBar, DEFAULT_FILTERS, type ConsolidatedFilters } from "@/components/portfolio/consolidated-filter-bar";
import { ConsolidatedStockList } from "@/components/portfolio/consolidated-stock-list";

function formatUpdatedAt(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return format(new Date(timestamp), "yy.MM.dd HH:mm");
}

export default function PortfolioPage() {
  const { accounts, selectedAccountId, isLoading: isAccountsLoading } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const isAllMode = selectedAccountId === "all";

  // 계좌 1개 + 전체 모드: 해당 계좌를 실질적으로 사용 (편집/리밸런싱 가능)
  const effectivePortfolioId = isAllMode && accounts.length === 1 ? accounts[0].id : portfolioId;
  const effectiveIsAllMode = isAllMode && accounts.length > 1;

  const { isPlusOrAbove } = useSubscription();
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
    toggleRebalanceTracked,
    isTogglingTracked,
    toggleNewsEnabled,
    isTogglingNews,
  } = useManualPortfolio(effectivePortfolioId, exchangeRate);
  const {
    activeSession,
  } = useProgressiveRebalance(effectivePortfolioId);
  const {
    balance: consolidatedBalance,
    isLoading: isConsolidatedLoading,
    stockAccountMap,
    breakdown,
    perAccountBalances,
  } = useConsolidatedPortfolio();

  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [filters, setFilters] = useState<ConsolidatedFilters>(DEFAULT_FILTERS);
  const [activeStockCode, setActiveStockCode] = useState<string | null>(null);

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

  // Filtered data for "all accounts" view
  const { filteredStocks, filteredCash, filteredTotalValue } = useMemo(() => {
    if (!effectiveIsAllMode || !consolidatedBalance) {
      return { filteredStocks: [], filteredCash: 0, filteredTotalValue: 0 };
    }

    // 1. Base data: account filter
    let stocks = consolidatedBalance.stocks;
    let accountCash = consolidatedBalance.cash;
    if (filters.accountId !== "all") {
      const accountBalance = perAccountBalances[filters.accountId];
      if (accountBalance) {
        stocks = accountBalance.stocks;
        accountCash = accountBalance.cash;
      } else {
        return { filteredStocks: [], filteredCash: 0, filteredTotalValue: 0 };
      }
    }

    // 2. Currency filter
    if (filters.currency !== "all") {
      stocks = stocks.filter((s) => (s.currency ?? "KRW") === filters.currency);
      if (filters.currency === "USD") accountCash = 0;
    }

    // 3. Profit status filter
    if (filters.profitStatus === "profit") {
      stocks = stocks.filter((s) => s.profit_rate > 0);
    } else if (filters.profitStatus === "loss") {
      stocks = stocks.filter((s) => s.profit_rate < 0);
    }

    // 4. Sort
    const sorted = [...stocks];
    switch (filters.sortBy) {
      case "eval_amount":
        sorted.sort((a, b) => b.eval_amount - a.eval_amount);
        break;
      case "profit_rate":
        sorted.sort((a, b) => b.profit_rate - a.profit_rate);
        break;
      case "name":
        sorted.sort((a, b) => a.stock_name.localeCompare(b.stock_name, "ko"));
        break;
    }

    const total = sorted.reduce((sum, s) => sum + s.eval_amount, 0) + accountCash;
    return { filteredStocks: sorted, filteredCash: accountCash, filteredTotalValue: total };
  }, [effectiveIsAllMode, consolidatedBalance, filters, perAccountBalances]);

  function handleDeleteStock(id: string) {
    const stock = stocks.find((s) => s.id === id);
    deleteStock(id);
    toast.success(`${stock?.stock_name ?? "종목"}이 삭제되었습니다.`);
  }

  function handleAddStock(data: ManualStockInput) {
    addStock(data);
    toast.success(`${data.stock_name} 종목이 추가되었습니다.`);
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
        <div className="space-y-3 md:space-y-4">
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
        <div className="space-y-3 md:space-y-4">
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
    const allStocksCount = consolidatedBalance?.stocks?.length ?? 0;

    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              모든 계좌의 자산을 통합하여 표시합니다.
            </p>
          </div>

          <AccountTabs />

          <PortfolioHero
            totalValue={allTotalValue}
            totalProfitLoss={allProfitLoss}
            totalProfitRate={allProfitRate}
            cash={allCash}
            isLoading={false}
          />

          <ConsolidatedFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            breakdown={breakdown}
            filteredCount={filteredStocks.length}
            totalCount={allStocksCount}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-4">
              <AllocationChart
                stocks={filteredStocks}
                cash={filteredCash}
                totalValue={filteredTotalValue}
                isLoading={false}
                activeStockCode={activeStockCode}
                onHoverChange={setActiveStockCode}
              />
            </div>

            <div className="lg:col-span-8">
              <ConsolidatedStockList
                stocks={filteredStocks}
                stockAccountMap={stockAccountMap}
                filterAccountId={filters.accountId !== "all" ? filters.accountId : undefined}
                activeStockCode={activeStockCode}
                onHoverChange={setActiveStockCode}
              />
            </div>
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
        <div className="space-y-3 md:space-y-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              보유 자산과 현재 비중을 확인하고 관리합니다.
            </p>
          </div>

          <AccountTabs />

          <PortfolioHero
            totalValue={totalValue}
            totalProfitLoss={totalProfitLoss}
            totalProfitRate={totalProfitRate}
            cash={cash}
            isLoading={isLoading}
            onCashChange={setCash}
            isCashSaving={isCashSaving}
          />

          <StockTable
            stocks={stocks}
            onUpdate={updateStock}
            onDelete={handleDeleteStock}
            exchangeRate={exchangeRate}
            onAddStock={handleAddStock}
            isAdding={isAdding}
            onToggleTracked={toggleRebalanceTracked}
            isTogglingTracked={isTogglingTracked}
            hasActiveSession={!!activeSession}
            onToggleNews={toggleNewsEnabled}
            isTogglingNews={isTogglingNews}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 md:space-y-8">
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

        {/* Portfolio Hero */}
        <PortfolioHero
          totalValue={totalValue}
          totalProfitLoss={totalProfitLoss}
          totalProfitRate={totalProfitRate}
          cash={cash}
          isLoading={isLoading}
          onCashChange={setCash}
          isCashSaving={isCashSaving}
          accountId={effectivePortfolioId}
        />

        {/* Rebalancing Summary Cards - Full Width */}
        <RebalanceSummaryCards stocks={stocks} accountId={effectivePortfolioId} />

        {/* Stock Table - Full Width */}
        <StockTable
          stocks={stocks}
          onUpdate={updateStock}
          onDelete={handleDeleteStock}
          onRefresh={isPlusOrAbove ? handleRefreshPrices : undefined}
          isRefreshing={isRefreshing}
          exchangeRate={exchangeRate}
          totalPortfolioValue={totalValue}
          onAddStock={handleAddStock}
          isAdding={isAdding}
          onToggleTracked={toggleRebalanceTracked}
          isTogglingTracked={isTogglingTracked}
          hasActiveSession={!!activeSession}
          onToggleNews={toggleNewsEnabled}
          isTogglingNews={isTogglingNews}
        />

        {/* Target Weight Editor (with Allocation Chart inside) */}
        <TargetWeightEditor
          mode="inline"
          stocks={stocks}
          cashAmount={cash}
          exchangeRate={exchangeRate ?? 1}
          onSave={handleSaveTargets}
          isSaving={isSavingTargets}
          chart={
            <AllocationChart
              stocks={balance?.stocks ?? []}
              cash={cash}
              totalValue={totalValue}
              isLoading={isLoading}
            />
          }
        />

        {/* Bottom CTA - Mobile Only (inline, not fixed) */}
        <div className="md:hidden">
          <Button asChild className="w-full" size="lg">
            <Link href={`/rebalance?account=${effectivePortfolioId}`}>리밸런싱으로 이동</Link>
          </Button>
        </div>
      </div>

    </PageTransition>
  );
}
