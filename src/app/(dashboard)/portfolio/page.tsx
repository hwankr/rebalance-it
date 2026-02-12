"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { usePortfolio } from "@/hooks/use-portfolio";
import { SummaryCards } from "@/components/portfolio/summary-cards";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const { settings, isLoading: settingsLoading } = useSettings();
  const account = settings.account;

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt, isMarketOpen } =
    usePortfolio(account);

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              계좌 정보가 설정되지 않았습니다. 설정 페이지에서 계좌를 연결해주세요.
            </p>
            <Link href="/settings">
              <Button>설정으로 이동</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500 mb-4">
              {error instanceof Error
                ? error.message
                : "데이터를 불러오는 중 오류가 발생했습니다."}
            </p>
            <Button onClick={() => refetch()}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
            <Badge variant={isMarketOpen ? "default" : "secondary"}>
              {isMarketOpen ? "장중" : "장외"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            보유 자산과 현재 비중을 확인합니다.
            {dataUpdatedAt > 0 && (
              <span className="ml-2 text-xs">
                마지막 갱신: {formatUpdatedAt(dataUpdatedAt)}
                {isMarketOpen ? " (10초마다 자동 갱신)" : " (장외 - 수동 갱신)"}
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

      <SummaryCards
        totalValue={data?.total_value ?? 0}
        totalProfitLoss={data?.total_profit_loss ?? 0}
        totalProfitRate={data?.total_profit_rate ?? 0}
        cash={data?.cash ?? 0}
        stockCount={data?.stocks.length ?? 0}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>자산 배분</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart
              stocks={data?.stocks ?? []}
              cash={data?.cash ?? 0}
              totalValue={data?.total_value ?? 0}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>보유 종목</CardTitle>
          </CardHeader>
          <CardContent>
            <HoldingsTable
              stocks={data?.stocks ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
