"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";

const MAX_HISTORY = 50;

export function useHistory() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ["history", user?.id];

  const { data: history = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<RebalanceExecution[]> => {
      const { data, error } = await supabase
        .from("executions")
        .select("*")
        .eq("user_id", user!.id)
        .order("executed_at", { ascending: false })
        .limit(MAX_HISTORY);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        profile_id: row.profile_id ?? "",
        preset_name: (row.preset_name as string | null) ?? undefined,
        status: row.status as RebalanceExecution["status"],
        orders: (row.orders as unknown as RebalanceExecution["orders"]) ?? [],
        total_buy_amount: Number(row.total_buy_amount),
        total_sell_amount: Number(row.total_sell_amount),
        net_cash_change: Number(row.net_cash_change),
      }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<RebalanceExecution, "id" | "executed_at">) => {
      const displayName = data.preset_name ?? data.profile_name ?? "직접 설정";
      const { error } = await supabase
        .from("executions")
        .insert({
          user_id: user!.id,
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
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
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
      const { error } = await supabase
        .from("executions")
        .delete()
        .eq("user_id", user!.id);
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
