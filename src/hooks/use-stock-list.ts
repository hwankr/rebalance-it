"use client";

import { useQuery } from "@tanstack/react-query";

export interface StockItem {
  stock_code: string;
  stock_name: string;
  stock_name_ko: string | null;
  market: string;
  country: string;
  currency: string;
}

export function useStockList() {
  return useQuery<StockItem[]>({
    queryKey: ["stock-list"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/stocks/list");
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0)
          throw new Error("Empty response");
        return data;
      } catch (error) {
        console.warn("Falling back to static stock list:", error);
        const fallbackRes = await fetch("/data/stocks.json");
        if (!fallbackRes.ok) throw new Error("Failed to fetch stock list");
        return fallbackRes.json();
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}
