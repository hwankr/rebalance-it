"use client";

import { useQuery } from "@tanstack/react-query";
import { useSettings } from "./use-settings";
import { usePortfolio } from "./use-portfolio";
import { useAuth } from "./use-auth";
import { useExchangeRate } from "./use-exchange-rate";
import { fetchManualPortfolio } from "./use-manual-portfolio";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";
import type { KiwoomBalanceResponse } from "@/lib/kiwoom/types";

/**
 * 데이터 소스(kiwoom/manual)에 따라 포트폴리오 데이터를 반환하는 래퍼 훅.
 * 기존 usePortfolio는 수정하지 않음 → 순수성 보존.
 */
export function usePortfolioData() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { rate: exchangeRate } = useExchangeRate();
  const isManual = settings.dataSource === "manual";
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;

  // 키움 모드: 기존 usePortfolio 그대로 사용
  const kiwoomQuery = usePortfolio(settings.account);

  // 수동 모드: Supabase에서 조회 (rate를 queryKey에 포함하여 환율 변경 시 재계산)
  const manualQuery = useQuery<KiwoomBalanceResponse>({
    queryKey: ["manual-portfolio", user?.id, rate],
    queryFn: () => fetchManualPortfolio(rate),
    enabled: isManual && !!user,
  });

  if (isManual) {
    return {
      data: manualQuery.data,
      isLoading: manualQuery.isLoading,
      isError: manualQuery.isError,
      error: manualQuery.error,
      refetch: manualQuery.refetch,
      isFetching: manualQuery.isFetching,
      dataUpdatedAt: manualQuery.dataUpdatedAt,
      isManualMode: true as const,
      isMarketOpen: false,
      exchangeRate: rate,
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
  };
}
