"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useRebalanceSettings } from "@/hooks/use-rebalance-settings";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import { toPortfolioItems } from "@/lib/rebalance/helpers";
import type { TargetAllocation } from "@/lib/rebalance/types";
import { DriftChart } from "@/components/rebalance/drift-chart";
import { OrderPreview } from "@/components/rebalance/order-preview";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SimulationResult = ReturnType<typeof simulateRebalance>;

function SimulateContent() {
  const router = useRouter();
  const { settings: rebalanceSettings } = useRebalanceSettings();
  const { data: portfolio, isLoading: portfolioLoading, targets } =
    usePortfolioData();

  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  const canSimulate = targets.length > 0 && !!portfolio;

  function handleSimulate() {
    if (!portfolio || targets.length === 0) return;

    const portfolioItems = toPortfolioItems(portfolio.stocks, targets);
    const result = simulateRebalance(portfolioItems, targets, portfolio.cash);
    setSimulationResult(result);
  }

  function handleViewGuide() {
    if (!simulationResult) return;

    sessionStorage.setItem(
      "rebalance-it-simulation",
      JSON.stringify({
        orders: simulationResult.orders,
        total_buy_amount: simulationResult.total_buy_amount,
        total_sell_amount: simulationResult.total_sell_amount,
        net_cash_change: simulationResult.net_cash_change,
      })
    );
    router.push("/rebalance/guide");
  }

  const buyCount =
    simulationResult?.orders.filter((o) => o.side === "buy").length ?? 0;
  const sellCount =
    simulationResult?.orders.filter((o) => o.side === "sell").length ?? 0;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">리밸런싱 시뮬레이션</h1>
        <p className="text-muted-foreground">
          시뮬레이션 결과를 미리 확인하고 리밸런싱 가이드를 받으세요.
        </p>
      </div>

      {/* 섹션 1: 목표 비중 */}
      <Card>
        <CardHeader>
          <CardTitle>목표 비중</CardTitle>
          <CardDescription>포트폴리오 페이지에서 설정한 목표 비중입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              포트폴리오 페이지에서 목표 비중을 설정해주세요.{" "}
              <Link
                href="/portfolio"
                className="text-primary underline underline-offset-4"
              >
                포트폴리오로 이동
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목명</TableHead>
                  <TableHead className="text-right">목표비중</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => (
                  <TableRow key={t.stock_code}>
                    <TableCell>{t.stock_name}</TableCell>
                    <TableCell className="text-right">
                      {t.target_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 섹션 2: 현재 포트폴리오 */}
      <Card>
        <CardHeader>
          <CardTitle>현재 포트폴리오</CardTitle>
          <CardDescription>연결된 계좌의 잔고 현황입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioLoading ? (
            <div className="space-y-3">
              <div className="h-5 w-48 skeleton-shimmer rounded bg-muted" />
              <div className="h-5 w-36 skeleton-shimmer rounded bg-muted" />
              <div className="h-5 w-28 skeleton-shimmer rounded bg-muted" />
            </div>
          ) : portfolio ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">총 평가금액</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(portfolio.total_value)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">예수금</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(portfolio.cash)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">보유 종목 수</p>
                <p className="text-lg font-semibold">
                  {portfolio.stocks.length}종목
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              잔고 정보를 불러올 수 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 섹션 3: 시뮬레이션 실행 */}
      <Card>
        <CardHeader>
          <CardTitle>시뮬레이션</CardTitle>
          <CardDescription>
            목표 비중과 포트폴리오를 기반으로 리밸런싱을 시뮬레이션합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSimulate} disabled={!canSimulate}>
            시뮬레이션 실행
          </Button>
          {!canSimulate && (
            <p className="mt-2 text-xs text-muted-foreground">
              {targets.length === 0
                ? "목표 비중을 먼저 설정해주세요."
                : "포트폴리오 정보가 필요합니다."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 섹션 4: 결과 */}
      {simulationResult && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>비중 편차 차트</CardTitle>
              <CardDescription>
                현재 비중과 목표 비중의 차이를 시각화합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DriftChart
                drifts={simulationResult.drift_before}
                threshold={rebalanceSettings.threshold_pct}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>매매 안내 미리보기</CardTitle>
              <CardDescription>
                리밸런싱을 위한 예상 거래 내역입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderPreview
                orders={simulationResult.orders}
                totalBuyAmount={simulationResult.total_buy_amount}
                totalSellAmount={simulationResult.total_sell_amount}
                netCashChange={simulationResult.net_cash_change}
              />
            </CardContent>
          </Card>

          {!simulationResult.cash_sufficient && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
              <p className="font-medium">현금이 부족합니다.</p>
              <p>매수 금액을 조정해주세요.</p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>예상 결과 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">매수</p>
                  <p className="text-lg font-semibold text-green-600">
                    {buyCount}건
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">매도</p>
                  <p className="text-lg font-semibold text-red-600">
                    {sellCount}건
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">순현금변동</p>
                  <p
                    className={`text-lg font-semibold ${
                      simulationResult.net_cash_change >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {simulationResult.net_cash_change >= 0 ? "+" : ""}
                    {formatCurrency(simulationResult.net_cash_change)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center gap-3">
            <Button onClick={handleViewGuide}>리밸런싱 가이드 보기</Button>
            <Button
              variant="outline"
              onClick={() => setSimulationResult(null)}
            >
              다시 시뮬레이션
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              뒤로
            </Button>
          </div>
        </>
      )}
    </div>
    </PageTransition>
  );
}

export default function SimulatePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">리밸런싱 시뮬레이션</h1>
            <p className="text-muted-foreground">
              시뮬레이션 결과를 미리 확인하고 리밸런싱 가이드를 받으세요.
            </p>
          </div>
          <div className="space-y-3">
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
          </div>
        </div>
      }
    >
      <SimulateContent />
    </Suspense>
  );
}
