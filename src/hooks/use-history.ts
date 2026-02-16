"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";

const MAX_HISTORY = 50;

export function useHistory(portfolioId?: string | null) {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["history", effectiveUserId, portfolioId ?? "all"];

  const { data: history = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<RebalanceExecution[]> => {
      let query = client
        .from("executions")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("executed_at", { ascending: false })
        .limit(MAX_HISTORY);

      // 특정 계좌 필터
      if (portfolioId) {
        query = query.eq("portfolio_id", portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: row.id,
          profile_id: row.profile_id ?? "",
          profile_name: row.profile_name,
          preset_name: (row.preset_name as string | null) ?? undefined,
          executed_at: row.executed_at,
          status: row.status as RebalanceExecution["status"],
          total_orders: row.total_orders,
          success_count: row.success_count,
          fail_count: row.fail_count,
          total_buy_amount: Number(row.total_buy_amount),
          total_sell_amount: Number(row.total_sell_amount),
          net_cash_change: Number(row.net_cash_change),
          orders: (row.orders as unknown as RebalanceExecution["orders"]) ?? [],
          started_at: (r.started_at as string | null) ?? undefined,
          completed_at: (r.completed_at as string | null) ?? undefined,
          portfolio_snapshot:
            (r.portfolio_snapshot as unknown as RebalanceExecution["portfolio_snapshot"]) ??
            undefined,
        };
      });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<RebalanceExecution, "id" | "executed_at">) => {
      const displayName = data.preset_name ?? data.profile_name ?? "직접 설정";
      const { error } = await client
        .from("executions")
        .insert({
          user_id: effectiveUserId,
          profile_id: null,
          profile_name: displayName,
          preset_name: data.preset_name ?? null,
          executed_at: new Date().toISOString(),
          status: data.status,
          total_orders: data.total_orders,
          success_count: data.success_count,
          fail_count: data.fail_count,
          total_buy_amount: data.total_buy_amount,
          total_sell_amount: data.total_sell_amount,
          net_cash_change: data.net_cash_change,
          orders: JSON.parse(JSON.stringify(data.orders)),
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from("executions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await client
        .from("executions")
        .delete()
        .eq("user_id", effectiveUserId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addExecution = useCallback(
    (data: Omit<RebalanceExecution, "id" | "executed_at">): void => {
      addMutation.mutate(data);
    },
    [addMutation],
  );

  const getExecution = useCallback(
    (id: string): RebalanceExecution | undefined => {
      return history.find((e) => e.id === id);
    },
    [history],
  );

  const deleteExecution = useCallback(
    (id: string): void => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const clearHistory = useCallback((): void => {
    clearMutation.mutate();
  }, [clearMutation]);

  return { history, isLoading, addExecution, getExecution, deleteExecution, clearHistory };
}
