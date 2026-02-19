"use client";

import { useMemo } from "react";
import { useManualPortfolio } from "./use-manual-portfolio";
import { useExchangeRate } from "./use-exchange-rate";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";
import type { TargetAllocation } from "@/lib/rebalance/types";

/**
 * 포트폴리오 데이터 + 목표 비중을 반환하는 훅.
 * portfolioId로 특정 계좌의 데이터를 조회합니다.
 * 현금 목표 비중은 100% - 주식 목표 비중 합계로 자동 계산됩니다.
 */
export function usePortfolioData(portfolioId: string | null) {
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
  } = useManualPortfolio(portfolioId, rate);

  // manual_stocks에서 target_pct > 0인 종목을 TargetAllocation으로 변환 + 현금 추가
  const targets = useMemo((): TargetAllocation[] => {
    const stockTargets = manualStocks
      .filter((s) => s.target_pct > 0 && s.is_rebalance_tracked !== false)
      .map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        target_pct: s.target_pct,
      }));

    // 현금 목표 비중 = 100% - 주식 목표 비중 합계
    const stockTargetSum = stockTargets.reduce((sum, t) => sum + t.target_pct, 0);
    const cashTargetPct = Math.max(0, 100 - stockTargetSum);

    return [
      ...stockTargets,
      {
        stock_code: "CASH",
        stock_name: "현금",
        target_pct: cashTargetPct,
        is_cash: true,
      },
    ];
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
