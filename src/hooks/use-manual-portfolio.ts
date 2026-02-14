"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { KiwoomBalanceResponse, KiwoomStock } from "@/lib/kiwoom/types";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";

// --- DB row types ---

interface ManualPortfolioRow {
  id: string;
  user_id: string;
  cash: number;
  created_at: string;
  updated_at: string;
}

interface ManualStockRow {
  id: string;
  portfolio_id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  price_updated_at: string | null;
  currency: string;
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
}

// --- 변환 로직 ---

function toBalanceResponse(
  portfolio: ManualPortfolioRow,
  stocks: ManualStockRow[],
  exchangeRate: number = DEFAULT_EXCHANGE_RATE,
): KiwoomBalanceResponse {
  const kiwoomStocks: KiwoomStock[] = stocks.map((s) => {
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

  const total_eval = kiwoomStocks.reduce((sum, s) => sum + s.eval_amount, 0);
  const total_cost = kiwoomStocks.reduce(
    (sum, s) => sum + s.avg_price * s.quantity,
    0,
  );
  const total_profit_loss = kiwoomStocks.reduce(
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
    stocks: kiwoomStocks,
  };
}

// --- 독립 fetch 함수 (usePortfolioData의 queryFn으로 사용) ---

export async function fetchManualPortfolio(
  exchangeRate: number = DEFAULT_EXCHANGE_RATE,
): Promise<KiwoomBalanceResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { cash: 0, total_value: 0, total_profit_loss: 0, total_profit_rate: 0, stocks: [] };
  }

  const { data: portfolio } = await supabase
    .from("manual_portfolios")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!portfolio) {
    return { cash: 0, total_value: 0, total_profit_loss: 0, total_profit_rate: 0, stocks: [] };
  }

  const { data: stocks } = await supabase
    .from("manual_stocks")
    .select("*")
    .eq("portfolio_id", portfolio.id)
    .order("created_at", { ascending: true });

  return toBalanceResponse(
    portfolio as ManualPortfolioRow,
    (stocks ?? []) as ManualStockRow[],
    exchangeRate,
  );
}

// --- Hook ---

export function useManualPortfolio(exchangeRate?: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;
  const queryKey = ["manual-portfolio", user?.id, rate];
  // Prefix key for mutation invalidation — clears all rate variants
  const invalidationKey = ["manual-portfolio", user?.id];

  // 포트폴리오 + 종목 조회
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data: portfolio } = await supabase
        .from("manual_portfolios")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      const stocks: ManualStockRow[] = [];
      if (portfolio) {
        const { data: stockRows } = await supabase
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

  // 예수금 설정 (포트폴리오 없으면 자동 생성)
  const setCashMutation = useMutation({
    mutationFn: async (cash: number) => {
      if (portfolio) {
        const { error } = await supabase
          .from("manual_portfolios")
          .update({ cash } as never)
          .eq("id", portfolio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manual_portfolios")
          .insert({ user_id: user!.id, cash } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
  });

  // 종목 추가
  const addStockMutation = useMutation({
    mutationFn: async (input: ManualStockInput) => {
      // 포트폴리오가 없으면 먼저 생성
      let portfolioId = portfolio?.id;
      if (!portfolioId) {
        const { data: newPortfolio, error: pErr } = await supabase
          .from("manual_portfolios")
          .insert({ user_id: user!.id, cash: 0 } as never)
          .select()
          .single();
        if (pErr) throw pErr;
        portfolioId = (newPortfolio as ManualPortfolioRow).id;
      }

      const { error } = await supabase.from("manual_stocks").insert({
        portfolio_id: portfolioId,
        stock_code: input.stock_code,
        stock_name: input.stock_name,
        quantity: input.quantity,
        avg_price: input.avg_price,
        current_price: input.current_price,
        currency: input.currency ?? "KRW",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidationKey }),
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
      const { error } = await supabase
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
      const { error } = await supabase
        .from("manual_stocks")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
    isAdding: addStockMutation.isPending,
    isUpdating: updateStockMutation.isPending,
  };
}
