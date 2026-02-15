"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useRebalanceSettings } from "@/hooks/use-rebalance-settings";
import {
  calculateDrift,
  needsRebalancing,
  getMaxDrift,
  toPortfolioItems,
} from "@/lib/rebalance";
import { formatPercent } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DriftChart } from "@/components/rebalance/drift-chart";
import { PageTransition } from "@/components/layout/page-transition";

export default function RebalancePage() {
  const { data: balance, isLoading, isError, error, isManualMode, targets: portfolioTargets } = usePortfolioData();
  const { settings: rebalanceSettings, isLoading: isSettingsLoading } = useRebalanceSettings();

  const threshold = rebalanceSettings?.threshold_pct ?? 5;

  const { drifts, maxDrift, rebalanceNeeded, targets } = useMemo(() => {
    if (!balance?.stocks?.length || !portfolioTargets?.length) {
      return { drifts: [], maxDrift: 0, rebalanceNeeded: false, targets: [] as typeof portfolioTargets };
    }

    const items = toPortfolioItems(balance.stocks, portfolioTargets);
    const driftResults = calculateDrift(items);

    return {
      drifts: driftResults,
      maxDrift: getMaxDrift(driftResults),
      rebalanceNeeded: needsRebalancing(driftResults, threshold),
      targets: portfolioTargets,
    };
  }, [balance, portfolioTargets, threshold]);

  if (!isManualMode && !balance && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">리밸런싱</h1>
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
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">리밸런싱</h1>
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
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">리밸런싱</h1>
        <p className="text-muted-foreground">
          현재 포트폴리오의 리밸런싱 현황을 확인합니다.
        </p>
      </div>

      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>최대 Drift</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading
                ? "..."
                : targets.length > 0
                  ? formatPercent(maxDrift)
                  : "-"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>리밸런싱 상태</CardDescription>
            <CardTitle>
              {isLoading ? (
                "..."
              ) : targets.length === 0 ? (
                "-"
              ) : rebalanceNeeded ? (
                <span className="relative">
                  <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <Badge variant="destructive">리밸런싱 필요</Badge>
                </span>
              ) : (
                <Badge variant="success">정상</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>마지막 시뮬레이션</CardDescription>
            <CardTitle className="text-2xl">-</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 중단: Drift 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>비중 Drift 현황</CardTitle>
          <CardDescription>
            현재 비중과 목표 비중의 차이를 시각화합니다.
            {targets.length > 0 && ` (임계값: ${threshold}%)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              포트폴리오 페이지에서 목표 비중을 설정해주세요.
            </div>
          ) : (
            <DriftChart
              drifts={drifts}
              threshold={threshold}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* 하단: 액션 버튼 */}
      <div className="flex flex-wrap gap-3 sm:gap-4">
        <Button asChild disabled={targets.length === 0}>
          <Link href="/rebalance/simulate">
            시뮬레이션 실행
          </Link>
        </Button>
      </div>
    </div>
    </PageTransition>
  );
}
