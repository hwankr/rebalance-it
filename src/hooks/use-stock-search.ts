"use client";

import { useMemo } from "react";
import { useStockList, type StockItem } from "./use-stock-list";

export type { StockItem };

export function useStockSearch(query: string) {
  const { data: stocks, isLoading } = useStockList();

  const results = useMemo(() => {
    if (!stocks || !query || query.length < 1) return [];

    const q = query.toLowerCase().trim();

    const scored = stocks
      .map((stock) => {
        const code = stock.stock_code.toLowerCase();
        const name = stock.stock_name.toLowerCase();
        const nameKo = stock.stock_name_ko?.toLowerCase() ?? "";

        let score = 0;

        if (code === q) score = 100;
        else if (code.startsWith(q)) score = 80;
        else if (name.startsWith(q) || nameKo.startsWith(q)) score = 70;
        else if (code.includes(q)) score = 50;
        else if (name.includes(q) || nameKo.includes(q)) score = 40;

        return { stock, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.stock);

    return scored;
  }, [stocks, query]);

  return { results, isLoading };
}
