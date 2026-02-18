"use client";

import { useQuery } from "@tanstack/react-query";

export interface StockNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string | null;
}

async function fetchNews(
  code: string,
  market?: string,
  name?: string,
): Promise<StockNewsItem[]> {
  const params = new URLSearchParams({ code, ...(market ? { market } : {}), ...(name ? { name } : {}) });
  const res = await fetch(`/api/stocks/news?${params}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "뉴스 조회에 실패했습니다.");
  }
  const json = await res.json();
  return json.items ?? [];
}

export function useStockNews(code: string | null, market?: string, name?: string) {
  return useQuery({
    queryKey: ["stock-news", code, market, name],
    queryFn: () => fetchNews(code!, market, name),
    enabled: !!code,
    staleTime: 4 * 60 * 60 * 1000, // 4시간 캐시
  });
}
