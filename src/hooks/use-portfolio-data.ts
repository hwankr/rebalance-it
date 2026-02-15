"use client";

import { useMemo } from "react";
import { useManualPortfolio } from "./use-manual-portfolio";
import { useExchangeRate } from "./use-exchange-rate";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";
import type { TargetAllocation } from "@/lib/rebalance/types";

/**
 * 포트폴리오 데이터 + 목표 비중을 반환하는 훅.
 * 항상 수동 포트폴리오를 사용합니다.
 */
export function usePortfolioData() {
  const { rate: exchangeRate } = useExchangeRate();
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;

  const {
    stocks: manualStocks,
    balance: manualBalance,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useManualPortfolio(rate);

  // manual_stocks에서 target_pct > 0인 종목을 TargetAllocation으로 변환
  const targets = useMemo((): TargetAllocation[] => {
    return manualStocks
      .filter((s) => s.target_pct > 0)
      .map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        target_pct: s.target_pct,
      }));
  }, [manualStocks]);

  return {
    data: manualBalance ?? undefined,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
    isManualMode: true as const,
    isMarketOpen: false,
    exchangeRate: rate,
    targets,
  };
}
