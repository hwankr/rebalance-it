"use client";

import { useState } from "react";
import { BarChart3, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStockFinancials } from "@/hooks/use-stock-financials";
import { useSubscription } from "@/hooks/use-subscription";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import type { StockFinancials } from "@/lib/stock-financials";
import { detectMarket } from "@/lib/utils/stock";

interface StockFinancialsCardProps {
  stockCode: string;
  stockName: string;
  currency?: string;
}

function formatLargeNumber(value: number | null, currency?: string): string {
  if (value === null) return "-";
  const isKRW = currency === "KRW";
  const absVal = Math.abs(value);

  if (isKRW) {
    if (absVal >= 1_000_000_000_000) {
      return `${(value / 1_000_000_000_000).toFixed(1)}조원`;
    }
    if (absVal >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(0)}억원`;
    }
    return `${value.toLocaleString("ko-KR")}원`;
  }
  // USD
  if (absVal >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (absVal >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function formatRatio(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(2);
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatPrice(value: number | null, currency?: string): string {
  if (value === null) return "-";
  if (currency === "KRW") return `${value.toLocaleString("ko-KR")}원`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchAISummary(
  data: StockFinancials,
): Promise<string> {
  const res = await fetch("/api/ai/stock-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "financials",
      stockName: data.stockName,
      data: JSON.stringify({
        marketCap: data.marketCap,
        trailingPE: data.trailingPE,
        forwardPE: data.forwardPE,
        priceToBook: data.priceToBook,
        trailingEps: data.trailingEps,
        dividendYield: data.dividendYield,
        totalRevenue: data.totalRevenue,
        revenueGrowth: data.revenueGrowth,
        operatingIncome: data.operatingIncome,
        profitMargins: data.profitMargins,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency,
      }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "AI 요약 생성에 실패했습니다.");
  }
  const json = await res.json();
  return json.summary;
}

export function StockFinancialsCard({
  stockCode,
  stockName,
  currency,
}: StockFinancialsCardProps) {
  const market = detectMarket(stockCode, currency);
  const { data, isLoading, error } = useStockFinancials(stockCode, market);
  const { isPro } = useSubscription();
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const summaryMutation = useMutation({
    mutationFn: fetchAISummary,
    onSuccess: (summary) => setAiSummary(summary),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            재무 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            재무 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            재무 데이터를 불러올 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const items: { label: string; value: string }[] = [
    { label: "시가총액", value: formatLargeNumber(data.marketCap, data.currency) },
    { label: "PER (TTM)", value: formatRatio(data.trailingPE) },
    { label: "PER (FWD)", value: formatRatio(data.forwardPE) },
    { label: "PBR", value: formatRatio(data.priceToBook) },
    { label: "EPS", value: formatPrice(data.trailingEps, data.currency) },
    { label: "배당수익률", value: formatPercent(data.dividendYield) },
    { label: "52주 최고", value: formatPrice(data.fiftyTwoWeekHigh, data.currency) },
    { label: "52주 최저", value: formatPrice(data.fiftyTwoWeekLow, data.currency) },
    { label: "매출", value: formatLargeNumber(data.totalRevenue, data.currency) },
    { label: "매출 성장률", value: formatPercent(data.revenueGrowth) },
    { label: "영업이익", value: formatLargeNumber(data.operatingIncome, data.currency) },
    { label: "이익률", value: formatPercent(data.profitMargins) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            {stockName} 재무 정보
          </CardTitle>
          {data.sector && (
            <Badge variant="secondary" className="text-[10px]">
              {data.sector}
              {data.industry ? ` · ${data.industry}` : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 재무 지표 그리드 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>

        {/* AI 요약 */}
        {isPro && (
          <div className="space-y-2 border-t pt-3">
            {aiSummary ? (
              <>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {aiSummary}
                </p>
                <AIDisclaimer />
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => summaryMutation.mutate(data)}
                disabled={summaryMutation.isPending}
              >
                {summaryMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI 요약 생성
              </Button>
            )}
            {summaryMutation.isError && (
              <p className="text-xs text-destructive">
                {summaryMutation.error instanceof Error
                  ? summaryMutation.error.message
                  : "요약 생성에 실패했습니다."}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
