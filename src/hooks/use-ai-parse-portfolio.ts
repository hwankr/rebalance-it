"use client";

import { useMutation } from "@tanstack/react-query";

export interface ParsedStock {
  stock_name: string;
  stock_code: string | null;
  quantity: number;
  avg_price: number;
  currency: "KRW" | "USD";
}

interface ParsePortfolioResponse {
  stocks: ParsedStock[];
}

export function useAIParsePortfolio() {
  return useMutation({
    mutationFn: async (text: string): Promise<ParsePortfolioResponse> => {
      const res = await fetch("/api/ai/parse-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `AI 파싱 실패 (${res.status})`);
      }

      return res.json();
    },
  });
}
