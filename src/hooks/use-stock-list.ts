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
      const res = await fetch("/api/stocks/list");
      if (!res.ok) throw new Error("Failed to fetch stock list");
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}
