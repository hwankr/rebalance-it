"use client";

import { useQuery } from "@tanstack/react-query";

interface ExchangeRateData {
  rate: number;
  from: string;
  to: string;
  updated_at: string;
}

export function useExchangeRate() {
  const { data, isLoading } = useQuery<ExchangeRateData>({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) throw new Error("Failed to fetch exchange rate");
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return { rate: data?.rate ?? 1350, isLoading };
}
