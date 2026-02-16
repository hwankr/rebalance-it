"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { toBalanceResponse, type ManualStockRow } from "@/hooks/use-manual-portfolio";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/utils/format";
import type { BalanceResponse } from "@/lib/rebalance/types";

interface PortfolioRow {
  id: string;
  name: string;
  cash: number;
  display_order: number;
}

export interface AccountBreakdown {
  accountId: string;
  accountName: string;
  totalValue: number;
  stockCount: number;
  cash: number;
}

/**
 * 전체 계좌의 자산을 통합 조회하는 훅.
 * 각 계좌별로 KRW 변환 후 합산하여 currency mixing 문제를 방지합니다.
 */
export function useConsolidatedPortfolio() {
  const client = useStorageClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { rate: exchangeRate } = useExchangeRate();
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATE;
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);

  const queryKey = ["consolidated-portfolio", effectiveUserId, rate];

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async () => {
      // 1. 모든 포트폴리오 조회
      const { data: portfolios, error: pErr } = await client
        .from("manual_portfolios")
        .select("id, name, cash, display_order")
        .eq("user_id", effectiveUserId!)
        .order("display_order", { ascending: true });
      if (pErr) throw pErr;
      if (!portfolios || portfolios.length === 0) {
        return { balance: null, breakdown: [] };
      }

      const portfolioRows = portfolios as PortfolioRow[];

      // 2. 모든 종목 조회 (per-portfolio to support guest storage client)
      const stockRows: ManualStockRow[] = [];
      for (const portfolio of portfolioRows) {
        const { data: stocks, error: sErr } = await client
          .from("manual_stocks")
          .select("*")
          .eq("portfolio_id", portfolio.id)
          .order("created_at", { ascending: true });
        if (sErr) throw sErr;
        if (stocks) stockRows.push(...(stocks as ManualStockRow[]));
      }

      // 3. 계좌별로 KRW 변환된 balance 생성
      const breakdown: AccountBreakdown[] = [];
      let totalCash = 0;
      const mergedStocksMap = new Map<
        string,
        {
          stock_code: string;
          stock_name: string;
          eval_amount: number;
          profit_loss: number;
          quantity: number;
          avg_price_krw_total: number;
          current_price_krw: number;
          currency: string;
        }
      >();

      for (const portfolio of portfolioRows) {
        const accountStocks = stockRows.filter(
          (s) => s.portfolio_id === portfolio.id,
        );
        const accountBalance = toBalanceResponse(
          portfolio as any,
          accountStocks,
          rate,
        );

        totalCash += accountBalance.cash;

        breakdown.push({
          accountId: portfolio.id,
          accountName: portfolio.name,
          totalValue: accountBalance.total_value,
          stockCount: accountStocks.length,
          cash: accountBalance.cash,
        });

        // 4. 종목별 합산 (KRW 변환된 값으로 합산 → currency mixing 방지)
        for (const stock of accountBalance.stocks) {
          const key = `${stock.stock_code}:${stock.currency ?? "KRW"}`;
          const existing = mergedStocksMap.get(key);
          if (existing) {
            existing.eval_amount += stock.eval_amount;
            existing.profit_loss += stock.profit_loss;
            existing.quantity += stock.quantity;
            existing.avg_price_krw_total += stock.avg_price * stock.quantity;
          } else {
            mergedStocksMap.set(key, {
              stock_code: stock.stock_code,
              stock_name: stock.stock_name,
              eval_amount: stock.eval_amount,
              profit_loss: stock.profit_loss,
              quantity: stock.quantity,
              avg_price_krw_total: stock.avg_price * stock.quantity,
              current_price_krw: stock.current_price,
              currency: stock.currency ?? "KRW",
            });
          }
        }
      }

      // 5. 통합 balance 생성
      const totalEval = Array.from(mergedStocksMap.values()).reduce(
        (sum, s) => sum + s.eval_amount,
        0,
      );
      const totalProfitLoss = Array.from(mergedStocksMap.values()).reduce(
        (sum, s) => sum + s.profit_loss,
        0,
      );
      const totalCost = Array.from(mergedStocksMap.values()).reduce(
        (sum, s) => sum + s.avg_price_krw_total,
        0,
      );
      const totalProfitRate =
        totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

      const consolidatedBalance: BalanceResponse = {
        cash: totalCash,
        total_value: totalEval + totalCash,
        total_profit_loss: totalProfitLoss,
        total_profit_rate: totalProfitRate,
        stocks: Array.from(mergedStocksMap.values()).map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          quantity: s.quantity,
          avg_price: s.quantity > 0 ? s.avg_price_krw_total / s.quantity : 0,
          current_price: s.current_price_krw,
          eval_amount: s.eval_amount,
          profit_loss: s.profit_loss,
          profit_rate:
            s.avg_price_krw_total > 0
              ? (s.profit_loss / s.avg_price_krw_total) * 100
              : 0,
          currency: s.currency,
        })),
      };

      return { balance: consolidatedBalance, breakdown };
    },
  });

  const balance = data?.balance ?? null;
  const breakdown = data?.breakdown ?? [];

  return {
    balance,
    breakdown,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  };
}
