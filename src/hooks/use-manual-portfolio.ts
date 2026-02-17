"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { BalanceResponse, Stock } from "@/lib/rebalance/types";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";

// --- DB row types ---

interface ManualPortfolioRow {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  cash: number;
  created_at: string;
  updated_at: string;
}

export interface ManualStockRow {
  id: string;
  portfolio_id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  price_updated_at: string | null;
  currency: string;
  target_pct: number;
  created_at: string;
  updated_at: string;
}

export interface ManualStockInput {
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  currency?: string;
  target_pct?: number;
  price_updated_at?: string | null;
}

// --- 변환 로직 ---

export function toBalanceResponse(
  portfolio: ManualPortfolioRow,
  stocks: ManualStockRow[],
  exchangeRate: number = DEFAULT_EXCHANGE_RATE,
): BalanceResponse {
  const convertedStocks: Stock[] = stocks.map((s) => {
    const isUsd = s.currency === "USD";
    const rate = isUsd ? exchangeRate : 1;
    const priceKrw = s.current_price * rate;
    const avgPriceKrw = s.avg_price * rate;
    const eval_amount = priceKrw * s.quantity;
    const profit_loss = (priceKrw - avgPriceKrw) * s.quantity;
    const profit_rate =
      s.avg_price > 0
        ? ((s.current_price - s.avg_price) / s.avg_price) * 100
        : 0;
    return {
      stock_code: s.stock_code,
      stock_name: s.stock_name,
      quantity: s.quantity,
      avg_price: avgPriceKrw,
      current_price: priceKrw,
      eval_amount,
      profit_loss,
      profit_rate,
      currency: s.currency,
      native_price: isUsd ? s.current_price : undefined,
      native_avg_price: isUsd ? s.avg_price : undefined,
    };
  });

  const total_eval = convertedStocks.reduce((sum, s) => sum + s.eval_amount, 0);
  const total_cost = convertedStocks.reduce(
    (sum, s) => sum + s.avg_price * s.quantity,
    0,
  );
  const total_profit_loss = convertedStocks.reduce(
    (sum, s) => sum + s.profit_loss,
    0,
  );
  const total_profit_rate =
    total_cost > 0 ? (total_profit_loss / total_cost) * 100 : 0;

  return {
    cash: Number(portfolio.cash),
    total_value: total_eval + Number(portfolio.cash),
    total_profit_loss,
    total_profit_rate,
    stocks: convertedStocks,
  };
}

// --- Hook ---

export function useManualPortfolio(
  portfolioId: string | null,
  exchangeRate?: number,
) {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;
  const queryKey = ["manual-portfolio", portfolioId, rate];
  const invalidationKey = ["manual-portfolio", portfolioId];

  // 포트폴리오 + 종목 조회
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey,
    enabled: (!!user || isGuest) && !!portfolioId,
    queryFn: async () => {
      const { data: portfolio } = await client
        .from("manual_portfolios")
        .select("*")
        .eq("id", portfolioId!)
        .maybeSingle();

      const stocks: ManualStockRow[] = [];
      if (portfolio) {
        const { data: stockRows } = await client
          .from("manual_stocks")
          .select("*")
          .eq("portfolio_id", portfolio.id)
          .order("created_at", { ascending: true });
        if (stockRows) stocks.push(...(stockRows as ManualStockRow[]));
      }

      return {
        portfolio: portfolio as ManualPortfolioRow | null,
        stocks,
        balance: portfolio
          ? toBalanceResponse(portfolio as ManualPortfolioRow, stocks, rate)
          : null,
      };
    },
  });

  const portfolio = data?.portfolio ?? null;
  const stocks = data?.stocks ?? [];
  const balance = data?.balance ?? null;

  // 예수금 설정
  const setCashMutation = useMutation({
    mutationFn: async (cash: number) => {
      if (!portfolioId) throw new Error("계좌가 선택되지 않았습니다");
      const { error } = await client
        .from("manual_portfolios")
        .update({ cash } as never)
        .eq("id", portfolioId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  // 종목 추가 (portfolioId 필수)
  const addStockMutation = useMutation({
    mutationFn: async (input: ManualStockInput) => {
      if (!portfolioId) throw new Error("계좌가 선택되지 않았습니다");

      const { error } = await client.from("manual_stocks").insert({
        portfolio_id: portfolioId,
        stock_code: input.stock_code,
        stock_name: input.stock_name,
        quantity: input.quantity,
        avg_price: input.avg_price,
        current_price: input.current_price,
        currency: input.currency ?? "KRW",
        target_pct: input.target_pct ?? 0,
        price_updated_at: input.price_updated_at ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidationKey });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  // 종목 수정
  const updateStockMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ManualStockInput>;
    }) => {
      const { error } = await client
        .from("manual_stocks")
        .update(updates as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  // 종목 삭제
  const deleteStockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from("manual_stocks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  // 목표 비중만 수정 (단건)
  const updateTargetPctMutation = useMutation({
    mutationFn: async ({ id, targetPct }: { id: string; targetPct: number }) => {
      const { error } = await client
        .from("manual_stocks")
        .update({ target_pct: targetPct } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  // 목표 비중 일괄 수정 (batch)
  const updateBatchTargetsMutation = useMutation({
    mutationFn: async (updates: { id: string; targetPct: number }[]) => {
      const results = await Promise.all(
        updates.map(({ id, targetPct }) =>
          client
            .from("manual_stocks")
            .update({ target_pct: targetPct } as never)
            .eq("id", id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  const setCash = useCallback(
    (cash: number) => setCashMutation.mutate(cash),
    [setCashMutation],
  );

  const addStock = useCallback(
    (input: ManualStockInput) => addStockMutation.mutate(input),
    [addStockMutation],
  );

  const updateStock = useCallback(
    (id: string, updates: Partial<ManualStockInput>) =>
      updateStockMutation.mutate({ id, updates }),
    [updateStockMutation],
  );

  const deleteStock = useCallback(
    (id: string) => deleteStockMutation.mutate(id),
    [deleteStockMutation],
  );

  const updateTargetPct = useCallback(
    (id: string, targetPct: number) =>
      updateTargetPctMutation.mutate({ id, targetPct }),
    [updateTargetPctMutation],
  );

  const updateBatchTargets = useCallback(
    (
      updates: { id: string; targetPct: number }[],
      options?: { onSuccess?: () => void; onError?: (error: Error) => void },
    ) =>
      updateBatchTargetsMutation.mutate(updates, options),
    [updateBatchTargetsMutation],
  );

  return {
    portfolio,
    stocks,
    balance,
    isLoading,
    isError,
    error,
    setCash,
    addStock,
    updateStock,
    deleteStock,
    updateTargetPct,
    updateBatchTargets,
    refetch,
    isFetching,
    dataUpdatedAt,
    isAdding: addStockMutation.isPending,
    isUpdating: updateStockMutation.isPending,
    isCashSaving: setCashMutation.isPending,
  };
}
