"use client";

import { useMemo, useState } from "react";
import { RefreshCw, FolderInput, Settings2 } from "lucide-react";
import Link from "next/link";

import { useManualPortfolio } from "@/hooks/use-manual-portfolio";
import { useSubscription } from "@/hooks/use-subscription";
import { useRefreshPrices } from "@/hooks/use-refresh-prices";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { usePresets } from "@/hooks/use-presets";
import { SummaryCards } from "@/components/portfolio/summary-cards";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { StockTable } from "@/components/manual-portfolio/stock-table";
import { PortfolioEditSection } from "@/components/portfolio/portfolio-edit-section";
import { PresetSelector } from "@/components/rebalance/preset-selector";
import { PresetManager } from "@/components/rebalance/preset-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/use-accounts";
import { useConsolidatedPortfolio } from "@/hooks/use-consolidated-portfolio";
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

  const { isPro } = useSubscription();
  const { refreshPrices, isRefreshing } = useRefreshPrices(portfolioId ?? undefined);
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
    activePresetId,
    applyPreset,
    isApplying,
    isAdding,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useManualPortfolio(portfolioId, exchangeRate);
  const { getPreset, isLoading: isPresetsLoading } = usePresets();
  const {
    balance: consolidatedBalance,
    isLoading: isConsolidatedLoading,
  } = useConsolidatedPortfolio();

  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);

  const activePreset = activePresetId ? getPreset(activePresetId) : null;
  const portfolioStockCodes = useMemo(
    () => new Set(stocks.map((s) => s.stock_code)),
    [stocks],
  );

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

  const hasTargets = stocks.some((s) => s.target_pct > 0);
  const comparisonData = useMemo(() => {
    if (!balance || !stocks.length) return [];
    return stocks.map((stock) => {
      const evalAmount =
        stock.currency === "USD"
          ? stock.current_price * (exchangeRate ?? 1) * stock.quantity
          : stock.current_price * stock.quantity;
      const currentPct = totalValue > 0 ? (evalAmount / totalValue) * 100 : 0;
      return {
        stock_name: stock.stock_name,
        stock_code: stock.stock_code,
        currentPct,
        targetPct: stock.target_pct,
        diff: stock.target_pct - currentPct,
      };
    });
  }, [stocks, balance, exchangeRate, totalValue]);
  const cashCurrentPct = totalValue > 0 ? (cash / totalValue) * 100 : 0;
  const totalStockTargetPct = stocks.reduce((sum, s) => sum + s.target_pct, 0);
  const cashTargetPct = Math.max(0, 100 - totalStockTargetPct);
  const cashDiff = cashTargetPct - cashCurrentPct;

  function handleDeleteStock(id: string) {
    const stock = stocks.find((s) => s.id === id);
    deleteStock(id);
    toast.success(`${stock?.stock_name ?? "종목"}이 삭제되었습니다.`);
  }

  function handleApplyPreset(
    presetTargets: import("@/lib/rebalance/preset-types").PresetTarget[],
    presetId: string,
  ) {
    applyPreset(presetTargets, {
      presetId,
      onSuccess: () => {
        toast.success("프리셋이 적용되었습니다.");
        setPresetSelectorOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  if (isAllMode ? isConsolidatedLoading : isLoading) {
    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
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
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
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

  // Consolidated "all accounts" view
  if (isAllMode) {
    const allTotalValue = consolidatedBalance?.total_value ?? 0;
    const allProfitLoss = consolidatedBalance?.total_profit_loss ?? 0;
    const allProfitRate = consolidatedBalance?.total_profit_rate ?? 0;
    const allCash = consolidatedBalance?.cash ?? 0;
    const allStocks = consolidatedBalance?.stocks ?? [];

    return (
      <PageTransition>
        <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              전체 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              모든 계좌의 자산을 통합하여 표시합니다.
            </p>
          </div>

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
              <CardHeader>
                <CardTitle>자산 배분</CardTitle>
              </CardHeader>
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
              <CardHeader>
                <CardTitle>전체 보유 종목</CardTitle>
              </CardHeader>
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
                              stock.profit_rate > 0 &&
                                "text-green-600 dark:text-green-400",
                              stock.profit_rate < 0 &&
                                "text-red-600 dark:text-red-400",
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
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              내 포트폴리오
            </h1>
            <p className="text-sm text-muted-foreground">
              보유 자산과 현재 비중을 확인하고 관리합니다.
            </p>
          </div>

          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-muted-foreground mb-4">
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

  return (
    <PageTransition>
      <div className="space-y-3 md:space-y-4 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
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

        {/* Summary Cards */}
        <SummaryCards
          totalValue={totalValue}
          totalProfitLoss={totalProfitLoss}
          totalProfitRate={totalProfitRate}
          cash={cash}
          stockCount={stocks.length}
          isLoading={isLoading}
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

        {/* 현재 vs 목표 비중 + 프리셋 */}
        {hasTargets && (
          <div className="space-y-2">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-base font-semibold">현재 vs 목표 비중</h3>
                <div className="flex items-center gap-2">
                  {activePreset ? (
                    <Badge variant="secondary" className="text-xs">
                      {activePreset.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      프리셋 없음
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setPresetSelectorOpen(true)}
                  >
                    <FolderInput className="size-3.5" />
                    프리셋
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setPresetManagerOpen(true)}
                  >
                    <Settings2 className="size-3.5" />
                    관리
                  </Button>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium">종목</th>
                      <th className="text-right py-3 px-4 font-medium">현재 비중</th>
                      <th className="text-right py-3 px-4 font-medium">목표 비중</th>
                      <th className="text-right py-3 px-4 font-medium">차이</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData
                      .filter((d) => d.targetPct > 0 || d.currentPct > 0.1)
                      .map((d) => (
                        <tr key={d.stock_code} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="font-medium">{d.stock_name}</div>
                            <div className="text-xs text-muted-foreground">{d.stock_code}</div>
                          </td>
                          <td className="text-right px-4 tabular-nums">{d.currentPct.toFixed(1)}%</td>
                          <td className="text-right px-4 tabular-nums">{d.targetPct.toFixed(1)}%</td>
                          <td className={cn(
                            "text-right px-4 tabular-nums font-medium",
                            d.diff > 0.5 && "text-blue-600 dark:text-blue-400",
                            d.diff < -0.5 && "text-red-600 dark:text-red-400",
                          )}>
                            {d.diff > 0 ? "+" : ""}{d.diff.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    {/* 현금 행 */}
                    <tr className="bg-muted/20">
                      <td className="py-3 px-4 font-medium text-muted-foreground">현금</td>
                      <td className="text-right px-4 tabular-nums">{cashCurrentPct.toFixed(1)}%</td>
                      <td className="text-right px-4 tabular-nums">{cashTargetPct.toFixed(1)}%</td>
                      <td className={cn(
                        "text-right px-4 tabular-nums font-medium",
                        cashDiff > 0.5 && "text-blue-600 dark:text-blue-400",
                        cashDiff < -0.5 && "text-red-600 dark:text-red-400",
                      )}>
                        {cashDiff > 0 ? "+" : ""}{cashDiff.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="space-y-0.5 md:hidden text-sm">
                {comparisonData
                  .filter((d) => d.targetPct > 0 || d.currentPct > 0.1)
                  .map((d) => (
                    <div key={d.stock_code} className="flex items-center justify-between py-2.5 px-2 border-b border-border/40 last:border-0">
                      <div className="font-medium truncate flex-1 pr-2">{d.stock_name}</div>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        <span>{d.currentPct.toFixed(1)}%</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{d.targetPct.toFixed(1)}%</span>
                        <span className={cn(
                          "font-medium min-w-[3.5rem] text-right",
                          d.diff > 0.5 && "text-blue-600 dark:text-blue-400",
                          d.diff < -0.5 && "text-red-600 dark:text-red-400",
                        )}>
                          {d.diff > 0 ? "+" : ""}{d.diff.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                <div className="flex items-center justify-between py-2.5 px-2 bg-muted/20 rounded-lg mt-2">
                  <div className="font-medium text-muted-foreground">현금</div>
                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    <span>{cashCurrentPct.toFixed(1)}%</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{cashTargetPct.toFixed(1)}%</span>
                    <span className={cn(
                      "font-medium min-w-[3.5rem] text-right",
                      cashDiff > 0.5 && "text-blue-600 dark:text-blue-400",
                      cashDiff < -0.5 && "text-red-600 dark:text-red-400",
                    )}>
                      {cashDiff > 0 ? "+" : ""}{cashDiff.toFixed(1)}%
                    </span>
                </div>
              </div>
              </div>
           </div>
        )}

        {/* 프리셋 선택 (타겟 미설정 시) */}
        {!hasTargets && stocks.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                프리셋을 적용하면 목표 비중과 현재 비중을 비교할 수 있습니다.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPresetSelectorOpen(true)}
                >
                  <FolderInput className="size-4" />
                  프리셋 적용
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPresetManagerOpen(true)}
                >
                  <Settings2 className="size-4" />
                  프리셋 관리
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t border-border p-3 z-10">
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

      {/* Preset Dialogs */}
      <PresetSelector
        open={presetSelectorOpen}
        onOpenChange={setPresetSelectorOpen}
        onApply={handleApplyPreset}
        isApplying={isApplying}
        portfolioStockCodes={portfolioStockCodes}
      />
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
