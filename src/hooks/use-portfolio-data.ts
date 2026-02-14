"use client";

import { useMemo } from "react";
import { useSettings } from "./use-settings";
import { usePortfolio } from "./use-portfolio";
import { useExchangeRate } from "./use-exchange-rate";
import { useManualPortfolio } from "./use-manual-portfolio";
import { useStockTargets } from "./use-stock-targets";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";
import type { TargetAllocation } from "@/lib/rebalance/types";

/**
 * 데이터 소스(kiwoom/manual)에 따라 포트폴리오 데이터 + 목표 비중을 반환하는 래퍼 훅.
 * 기존 usePortfolio는 수정하지 않음 → 순수성 보존.
 */
export function usePortfolioData() {
  const { settings } = useSettings();
  const { rate: exchangeRate } = useExchangeRate();
  const isManual = settings.dataSource === "manual";
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;

  // 키움 모드: 기존 usePortfolio 그대로 사용
  const kiwoomQuery = usePortfolio(settings.account);

  // 키움 모드: stock_targets에서 목표 비중 조회
  const { getTargetsAsAllocations } = useStockTargets();

  // 수동 모드: useManualPortfolio 하나로 통합 (queryKey 충돌 방지)
  const {
    stocks: manualStocks,
    balance: manualBalance,
    isLoading: manualLoading,
    isError: manualIsError,
    error: manualError,
    refetch: manualRefetch,
    isFetching: manualIsFetching,
    dataUpdatedAt: manualDataUpdatedAt,
  } = useManualPortfolio(rate);

  // 수동 모드: manual_stocks에서 target_pct > 0인 종목을 TargetAllocation으로 변환
  const manualTargets = useMemo((): TargetAllocation[] => {
    return manualStocks
      .filter((s) => s.target_pct > 0)
      .map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        target_pct: s.target_pct,
      }));
  }, [manualStocks]);

  // 통합 목표 비중 (데이터 소스 분기)
  const targets: TargetAllocation[] = isManual
    ? manualTargets
    : getTargetsAsAllocations();

  if (isManual) {
    return {
      data: manualBalance ?? undefined,
      isLoading: manualLoading,
      isError: manualIsError,
      error: manualError,
      refetch: manualRefetch,
      isFetching: manualIsFetching,
      dataUpdatedAt: manualDataUpdatedAt,
      isManualMode: true as const,
      isMarketOpen: false,
      exchangeRate: rate,
      targets,
    };
  }

  return {
    data: kiwoomQuery.data,
    isLoading: kiwoomQuery.isLoading,
    isError: kiwoomQuery.isError,
    error: kiwoomQuery.error,
    refetch: kiwoomQuery.refetch,
    isFetching: kiwoomQuery.isFetching,
    dataUpdatedAt: kiwoomQuery.dataUpdatedAt,
    isManualMode: false as const,
    isMarketOpen: kiwoomQuery.isMarketOpen,
    exchangeRate: rate,
    targets,
  };
}
