"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useProfiles } from "@/hooks/use-profiles";
import {
  calculateDrift,
  needsRebalancing,
  getMaxDrift,
  toPortfolioItems,
} from "@/lib/rebalance";
import type { TargetAllocation } from "@/lib/rebalance";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DriftChart } from "@/components/rebalance/drift-chart";

export default function RebalancePage() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const { profiles } = useProfiles();
  const { data: balance, isLoading, isError, error, isManualMode } = usePortfolioData();

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId],
  );

  const threshold = selectedProfile?.threshold_pct ?? 5;

  const { drifts, maxDrift, rebalanceNeeded } = useMemo(() => {
    if (!balance?.stocks?.length || !selectedProfile) {
      return { drifts: [], maxDrift: 0, rebalanceNeeded: false };
    }

    const targets: TargetAllocation[] = selectedProfile.targets.map((t) => ({
      stock_code: t.stock_code,
      stock_name: t.stock_name,
      target_pct: t.target_pct,
    }));
    const items = toPortfolioItems(balance.stocks, targets);
    const driftResults = calculateDrift(items);

    return {
      drifts: driftResults,
      maxDrift: getMaxDrift(driftResults),
      rebalanceNeeded: needsRebalancing(driftResults, threshold),
    };
  }, [balance, selectedProfile, threshold]);

  if (!isManualMode && !balance && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">리밸런싱</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-muted-foreground">
              계좌가 설정되지 않았습니다. 설정 페이지에서 계좌를 연결하거나 수동 모드를 사용해주세요.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/settings">설정으로 이동</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/manual-portfolio">수동 포트폴리오</Link>
              </Button>
            </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">리밸런싱</h1>
        <p className="text-muted-foreground">
          현재 포트폴리오의 리밸런싱 현황을 확인합니다.
        </p>
      </div>

      {/* 프로필 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 선택</CardTitle>
          <CardDescription>
            리밸런싱에 사용할 프로필을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                프로필을 먼저 만들어주세요.
              </p>
              <Button size="sm" asChild>
                <Link href="/profiles/new">프로필 생성</Link>
              </Button>
            </div>
          ) : (
            <Select
              value={selectedProfileId}
              onValueChange={setSelectedProfileId}
            >
              <SelectTrigger className="w-full max-w-xs">
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
          )}
        </CardContent>
      </Card>

      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>프로필명</CardDescription>
            <CardTitle className="text-2xl">
              {selectedProfile ? selectedProfile.name : "-"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>최대 Drift</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading
                ? "..."
                : selectedProfile
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
              ) : !selectedProfile ? (
                "-"
              ) : rebalanceNeeded ? (
                <Badge variant="destructive">리밸런싱 필요</Badge>
              ) : (
                <Badge variant="default">정상</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>마지막 실행</CardDescription>
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
            {selectedProfile && ` (임계값: ${threshold}%)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedProfile ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              프로필을 선택해주세요.
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
      <div className="flex gap-4">
        <Button asChild disabled={!selectedProfileId}>
          <Link
            href={
              selectedProfileId
                ? `/rebalance/simulate?profile=${selectedProfileId}`
                : "#"
            }
          >
            시뮬레이션 실행
          </Link>
        </Button>
        {selectedProfileId && (
          <Button variant="outline" asChild>
            <Link href={`/profiles/${selectedProfileId}`}>프로필 수정</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/profiles">프로필 관리</Link>
        </Button>
      </div>
    </div>
  );
}
