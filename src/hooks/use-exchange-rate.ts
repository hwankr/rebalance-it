"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

interface ExchangeRateData {
  rate: number;
  from: string;
  to: string;
  updated_at: string | null;
}

// --- Manual rate override via localStorage (same pattern as use-subscription.ts) ---

const MANUAL_RATE_KEY = "manual-exchange-rate";

function getStoredManualRate(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(MANUAL_RATE_KEY);
  if (val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

const manualRateListeners = new Set<() => void>();

function subscribeManualRate(cb: () => void) {
  manualRateListeners.add(cb);
  return () => manualRateListeners.delete(cb);
}

function writeManualRate(rate: number | null) {
  if (rate === null) {
    localStorage.removeItem(MANUAL_RATE_KEY);
  } else {
    localStorage.setItem(MANUAL_RATE_KEY, String(rate));
  }
  manualRateListeners.forEach((cb) => cb());
}

// --- Hook ---

export function useExchangeRate() {
  const manualRate = useSyncExternalStore(
    subscribeManualRate,
    () => getStoredManualRate(),
    () => null,
  );

  const { data, isLoading: isQueryLoading } = useQuery<ExchangeRateData>({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) throw new Error("Failed to fetch exchange rate");
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const apiRate = data?.rate ?? 1350;
  const rate = manualRate ?? apiRate;
  const isManualRate = manualRate !== null;
  const isLoading = isManualRate ? false : isQueryLoading;
  const updatedAt = data?.updated_at ?? null;

  const setManualRate = useCallback((newRate: number) => {
    writeManualRate(newRate);
  }, []);

  const clearManualRate = useCallback(() => {
    writeManualRate(null);
  }, []);

  return {
    rate,
    apiRate,
    isLoading,
    updatedAt,
    isManualRate,
    setManualRate,
    clearManualRate,
  };
}
