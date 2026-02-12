"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProfiles } from "@/hooks/use-profiles";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import { toPortfolioItems } from "@/lib/rebalance/helpers";
import type { TargetAllocation } from "@/lib/rebalance/types";
import { DriftChart } from "@/components/rebalance/drift-chart";
import { OrderPreview } from "@/components/rebalance/order-preview";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const searchParams = useSearchParams();
  const { profiles } = useProfiles();
  const { data: portfolio, isLoading: portfolioLoading, isManualMode } =
    usePortfolioData();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  // URL searchParams에서 profile 자동 선택
  useEffect(() => {
    const profileParam = searchParams.get("profile");
    if (profileParam && profiles.length > 0) {
      const found = profiles.find((p) => p.id === profileParam);
      if (found) {
        setSelectedProfileId(found.id);
      }
    }
  }, [searchParams, profiles]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const canSimulate = !!selectedProfile && !!portfolio;

  function handleSimulate() {
    if (!selectedProfile || !portfolio) return;

    const targets: TargetAllocation[] = selectedProfile.targets.map((t) => ({
      stock_code: t.stock_code,
      stock_name: t.stock_name,
      target_pct: t.target_pct,
    }));

    const portfolioItems = toPortfolioItems(portfolio.stocks, targets);
    const result = simulateRebalance(portfolioItems, targets, portfolio.cash);
    setSimulationResult(result);
  }

  function handleExecute() {
    if (!simulationResult || !selectedProfile) return;
    if (isManualMode) return; // 수동 모드에서는 실제 주문 불가

    sessionStorage.setItem(
      "rebalance-it-simulation",
      JSON.stringify({
        orders: simulationResult.orders,
        account: "",
        profile_name: selectedProfile.name,
        profile_id: selectedProfile.id,
        total_buy_amount: simulationResult.total_buy_amount,
        total_sell_amount: simulationResult.total_sell_amount,
        net_cash_change: simulationResult.net_cash_change,
      })
    );
    router.push("/rebalance/execute");
  }

  const buyCount =
    simulationResult?.orders.filter((o) => o.side === "buy").length ?? 0;
  const sellCount =
    simulationResult?.orders.filter((o) => o.side === "sell").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">리밸런싱 시뮬레이션</h1>
        <p className="text-muted-foreground">
          리밸런싱 실행 전 결과를 미리 확인합니다.
        </p>
      </div>

      {/* 섹션 1: 프로필 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 선택</CardTitle>
          <CardDescription>리밸런싱에 사용할 프로필을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              먼저 프로필을 만들어주세요.{" "}
              <Link
                href="/profiles/new"
                className="text-primary underline underline-offset-4"
              >
                프로필 생성하기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedProfileId ?? ""}
                onValueChange={(value) => {
                  setSelectedProfileId(value);
                  setSimulationResult(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="프로필을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProfile && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>종목명</TableHead>
                      <TableHead className="text-right">목표비중</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProfile.targets.map((t) => (
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
            </div>
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
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
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
            프로필과 포트폴리오를 기반으로 리밸런싱을 시뮬레이션합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSimulate} disabled={!canSimulate}>
            시뮬레이션 실행
          </Button>
          {!canSimulate && (
            <p className="mt-2 text-xs text-muted-foreground">
              프로필과 포트폴리오가 모두 준비되어야 실행할 수 있습니다.
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
                threshold={selectedProfile?.threshold_pct}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주문 미리보기</CardTitle>
              <CardDescription>
                리밸런싱을 위한 예상 주문 내역입니다.
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

          {/* 수동 모드 안내 */}
          {isManualMode && (
            <div className="rounded-lg border border-blue-500/50 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <p className="font-medium">수동 모드에서는 실제 주문을 실행할 수 없습니다.</p>
              <p>시뮬레이션 결과만 확인할 수 있습니다.</p>
            </div>
          )}

          {/* 하단 액션 버튼 */}
          <div className="flex items-center gap-3">
            <Button onClick={handleExecute} disabled={isManualMode}>주문 실행하기</Button>
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
              리밸런싱 실행 전 결과를 미리 확인합니다.
            </p>
          </div>
          <div className="space-y-3">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      }
    >
      <SimulateContent />
    </Suspense>
  );
}
