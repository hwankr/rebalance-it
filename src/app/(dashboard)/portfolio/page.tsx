"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { SummaryCards } from "@/components/portfolio/summary-cards";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";

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
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt, exchangeRate } =
    usePortfolioData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
        <div className="space-y-3">
          <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
          <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!data?.stocks || data.stocks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">포트폴리오 현황</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              포트폴리오에 종목을 추가해주세요.
            </p>
            <Link href="/manual-portfolio">
              <Button>포트폴리오 관리</Button>
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
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">포트폴리오 현황</h1>
          <p className="text-muted-foreground">
            보유 자산과 현재 비중을 확인합니다.
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

      <SummaryCards
        totalValue={data?.total_value ?? 0}
        totalProfitLoss={data?.total_profit_loss ?? 0}
        totalProfitRate={data?.total_profit_rate ?? 0}
        cash={data?.cash ?? 0}
        stockCount={data?.stocks?.length ?? 0}
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
              exchangeRate={exchangeRate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
    </PageTransition>
  );
}
