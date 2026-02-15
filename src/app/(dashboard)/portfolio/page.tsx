"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";

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
  const { isPro } = useSubscription();
  const { refreshPrices, isRefreshing } = useRefreshPrices();
  const {
    rate: exchangeRate,
    apiRate,
    updatedAt,
    isManualRate,
    setManualRate,
    clearManualRate,
  } = useExchangeRate();
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
  } = useManualPortfolio(exchangeRate);

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

  function handleDeleteStock(id: string) {
    const stock = stocks.find((s) => s.id === id);
    deleteStock(id);
    toast.success(`${stock?.stock_name ?? "종목"}이 삭제되었습니다.`);
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6 pb-32 md:pb-0">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
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

  // Empty state: show centered prompt with form expanded
  if (stocks.length === 0) {
    return (
      <PageTransition>
        <div className="space-y-6 pb-32 md:pb-0">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
              내 포트폴리오
            </h1>
            <p className="text-muted-foreground">
              보유 자산과 현재 비중을 확인하고 관리합니다.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-6">
                포트폴리오에 종목을 추가해주세요.
              </p>
              <PortfolioEditSection
                portfolio={portfolio}
                stocks={stocks}
                exchangeRate={exchangeRate}
                apiRate={apiRate}
                updatedAt={updatedAt}
                isManualRate={isManualRate}
                onSetManualRate={setManualRate}
                onClearManualRate={clearManualRate}
                onSetCash={setCash}
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

  const totalValue = balance?.total_value ?? 0;
  const totalProfitLoss = balance?.total_profit_loss ?? 0;
  const totalProfitRate = balance?.total_profit_rate ?? 0;
  const cash = Number(portfolio?.cash ?? 0);

  return (
    <PageTransition>
      <div className="space-y-6 pb-32 md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
              내 포트폴리오
            </h1>
            <p className="text-muted-foreground">
              보유 자산과 현재 비중을 확인하고 관리합니다.
              {dataUpdatedAt > 0 && (
                <span className="ml-2 text-xs">
                  마지막 갱신: {formatUpdatedAt(dataUpdatedAt)}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        {/* Summary Cards */}
        <SummaryCards
          totalValue={totalValue}
          totalProfitLoss={totalProfitLoss}
          totalProfitRate={totalProfitRate}
          cash={cash}
          stockCount={stocks.length}
          isLoading={isLoading}
        />

        {/* Allocation Chart + Stock Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>자산 배분</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationChart
                stocks={balance?.stocks ?? []}
                cash={cash}
                totalValue={totalValue}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>보유 종목</CardTitle>
            </CardHeader>
            <CardContent>
              <StockTable
                stocks={stocks}
                onUpdate={updateStock}
                onDelete={handleDeleteStock}
                onRefresh={isPro ? handleRefreshPrices : undefined}
                isRefreshing={isRefreshing}
                exchangeRate={exchangeRate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Edit Section (Collapsible) */}
        <PortfolioEditSection
          portfolio={portfolio}
          stocks={stocks}
          exchangeRate={exchangeRate}
          apiRate={apiRate}
          updatedAt={updatedAt}
          isManualRate={isManualRate}
          onSetManualRate={setManualRate}
          onClearManualRate={clearManualRate}
          onSetCash={setCash}
          onAddStock={addStock}
          isAdding={isAdding}
          onRefreshPrices={isPro ? handleRefreshPrices : undefined}
          isRefreshing={isRefreshing}
          defaultExpanded={false}
        />

        {/* Sticky Bottom CTA - Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm border-t border-border p-4 z-10">
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
