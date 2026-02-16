"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RefreshResult {
  updated: number;
  failed: number;
  errors: Array<{ stock_code: string; error: string }>;
  exchange_rate: number;
}

export function useRefreshPrices(portfolioId?: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation<RefreshResult>({
    mutationFn: async () => {
      const res = await fetch("/api/manual-portfolio/refresh-prices", {
        method: "POST",
        headers: portfolioId ? { "Content-Type": "application/json" } : {},
        body: portfolioId ? JSON.stringify({ portfolio_id: portfolioId }) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "가격 업데이트에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: async () => {
      if (portfolioId) {
        await queryClient.refetchQueries({ queryKey: ["manual-portfolio", portfolioId] });
      } else {
        await queryClient.refetchQueries({ queryKey: ["manual-portfolio"] });
      }
      queryClient.invalidateQueries({ queryKey: ["consolidated-portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
    },
  });

  return {
    refreshPrices: mutation.mutate,
    isRefreshing: mutation.isPending,
    lastResult: mutation.data,
    error: mutation.error,
  };
}
