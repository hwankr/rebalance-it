"use client";

import { useState } from "react";
import { Newspaper, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStockNews } from "@/hooks/use-stock-news";
import { useSubscription } from "@/hooks/use-subscription";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import type { StockNewsItem } from "@/hooks/use-stock-news";
import { detectMarket } from "@/lib/utils/stock";

interface StockNewsCardProps {
  stockCode: string;
  stockName: string;
  currency?: string;
}

function formatTimeAgo(isoDate: string): string {
  if (!isoDate) return "";
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}일 전`;
  if (diffHours > 0) return `${diffHours}시간 전`;
  return "방금 전";
}

async function fetchNewsSummary(
  items: StockNewsItem[],
  stockName: string,
): Promise<string> {
  const newsText = items
    .map(
      (item, i) =>
        `${i + 1}. [${item.source}] ${item.title}`,
    )
    .join("\n");

  const res = await fetch("/api/ai/stock-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "news",
      stockName,
      data: newsText,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "뉴스 요약 생성에 실패했습니다.");
  }
  const json = await res.json();
  return json.summary;
}

export function StockNewsCard({
  stockCode,
  stockName,
  currency,
}: StockNewsCardProps) {
  const market = detectMarket(stockCode, currency);
  const isKorean = market === "KOSPI" || /^\d{6}$/.test(stockCode);
  const cardTitle = isKorean ? "증권사 리포트" : "최근 뉴스";
  const { data: newsItems, isLoading, error } = useStockNews(stockCode, market, stockName);
  const { isPro } = useSubscription();
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const summaryMutation = useMutation({
    mutationFn: (items: StockNewsItem[]) =>
      fetchNewsSummary(items, stockName),
    onSuccess: (summary) => setAiSummary(summary),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4" />
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !newsItems) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4" />
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            뉴스를 불러올 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (newsItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4" />
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {cardTitle}가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Newspaper className="h-4 w-4" />
          {stockName} {cardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI 뉴스 요약 */}
        {isPro && (
          <div className="space-y-2">
            {aiSummary ? (
              <>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {aiSummary}
                </p>
                <AIDisclaimer />
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => summaryMutation.mutate(newsItems)}
                disabled={summaryMutation.isPending}
              >
                {summaryMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI 뉴스 요약
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

        {/* 뉴스 목록 */}
        <div className="space-y-3">
          {newsItems.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block space-y-0.5"
            >
              <div className="flex items-start gap-1.5">
                <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </span>
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{item.source}</span>
                {item.publishedAt && (
                  <>
                    <span>·</span>
                    <span>{formatTimeAgo(item.publishedAt)}</span>
                  </>
                )}
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
