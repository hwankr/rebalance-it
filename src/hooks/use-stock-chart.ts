"use client";

import { useQuery } from "@tanstack/react-query";
import type { ChartResponse } from "@/lib/rebalance/types";

async function fetchChart(
  code: string,
  period: "day" | "week" | "month",
  count: number,
  market?: string,
): Promise<ChartResponse> {
  const params = new URLSearchParams({
    period,
    count: String(count),
    ...(market ? { market } : {}),
  });
  const res = await fetch(
    `/api/stocks/chart/${encodeURIComponent(code)}?${params}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "차트 데이터 조회에 실패했습니다.");
  }
  return res.json();
}

export function useStockChart(
  code: string | null,
  period: "day" | "week" | "month" = "day",
  count: number = 60,
  market?: string,
) {
  return useQuery({
    queryKey: ["stock-chart", code, period, count],
    queryFn: () => fetchChart(code!, period, count, market),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}
