"use client";

import { useQuery } from "@tanstack/react-query";
import type { KiwoomChartResponse } from "@/lib/kiwoom/types";

async function fetchStockChart(
  code: string,
  period: string,
  count: number
): Promise<KiwoomChartResponse> {
  const res = await fetch(
    `/api/kiwoom/chart/${encodeURIComponent(code)}?period=${period}&count=${count}`
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
  count: number = 60
) {
  return useQuery({
    queryKey: ["stock-chart", code, period, count],
    queryFn: () => fetchStockChart(code!, period, count),
    enabled: !!code,
    staleTime: 60 * 1000,
  });
}
