"use client";

import { useQuery } from "@tanstack/react-query";
import type { StockFinancials } from "@/lib/stock-financials";

async function fetchFinancials(
  code: string,
  market?: string,
): Promise<StockFinancials> {
  const params = new URLSearchParams({ code, ...(market ? { market } : {}) });
  const res = await fetch(`/api/stocks/financials?${params}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "재무 데이터 조회에 실패했습니다.");
  }
  return res.json();
}

export function useStockFinancials(code: string | null, market?: string) {
  return useQuery({
    queryKey: ["stock-financials", code, market],
    queryFn: () => fetchFinancials(code!, market),
    enabled: !!code,
    staleTime: 24 * 60 * 60 * 1000, // 24시간 캐시
  });
}
