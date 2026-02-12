"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RefreshResult {
  updated: number;
  failed: number;
  errors: Array<{ stock_code: string; error: string }>;
  exchange_rate: number;
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  const mutation = useMutation<RefreshResult>({
    mutationFn: async () => {
      const res = await fetch("/api/manual-portfolio/refresh-prices", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "가격 업데이트에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["manual-portfolio"] });
    },
  });

  return {
    refreshPrices: mutation.mutate,
    isRefreshing: mutation.isPending,
    lastResult: mutation.data,
    error: mutation.error,
  };
}
