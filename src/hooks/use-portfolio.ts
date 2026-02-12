"use client";

import { useQuery } from "@tanstack/react-query";
import type { KiwoomBalanceResponse } from "@/lib/kiwoom/types";

async function fetchPortfolio(account: string): Promise<KiwoomBalanceResponse> {
  const res = await fetch(
    `/api/kiwoom/balance?account=${encodeURIComponent(account)}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "잔고 조회에 실패했습니다.");
  }
  return res.json();
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const timeInMinutes = now.getHours() * 60 + now.getMinutes();
  return timeInMinutes >= 540 && timeInMinutes <= 930;
}

export function usePortfolio(account: string) {
  const marketOpen = isMarketOpen();

  const query = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: !!account,
    refetchInterval: marketOpen ? 10 * 1000 : false,
  });

  return {
    ...query,
    dataUpdatedAt: query.dataUpdatedAt,
    isMarketOpen: marketOpen,
  };
}
