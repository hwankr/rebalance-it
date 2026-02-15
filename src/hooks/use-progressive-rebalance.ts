"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type {
  RebalanceExecution,
  ExecutionOrderResult,
  PortfolioSnapshot,
} from "@/lib/rebalance/history-types";
import type { RebalanceResult } from "@/lib/rebalance/types";

interface StartSessionParams {
  simulationResult: RebalanceResult;
  portfolioSnapshot: PortfolioSnapshot;
  presetName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseRpc = { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: any; error: any }> };

export function useProgressiveRebalance() {
  const supabase = createClient();
  const rpc = supabase as unknown as SupabaseRpc;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const activeSessionKey = ["active-session", user?.id];
  const historyKey = ["history", user?.id];

  // 활성 세션 조회
  const {
    data: activeSession,
    isLoading: isLoadingSession,
    refetch: refetchActiveSession,
  } = useQuery({
    queryKey: activeSessionKey,
    enabled: !!user,
    staleTime: 0, // 활성 세션은 항상 최신 상태 유지
    refetchOnMount: "always",
    queryFn: async (): Promise<RebalanceExecution | null> => {
      const { data, error } = await supabase
        .from("executions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapExecution(data);
    },
  });

  // 특정 세션 조회
  function useSession(executionId: string | undefined) {
    return useQuery({
      queryKey: ["execution", executionId],
      enabled: !!executionId && !!user,
      queryFn: async (): Promise<RebalanceExecution | null> => {
        const { data, error } = await supabase
          .from("executions")
          .select("*")
          .eq("id", executionId!)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapExecution(data);
      },
    });
  }

  // 세션 시작
  const startMutation = useMutation({
    mutationFn: async (params: StartSessionParams): Promise<string> => {
      const { simulationResult, portfolioSnapshot, presetName } = params;
      const orders: ExecutionOrderResult[] = simulationResult.orders.map(
        (o) => ({
          ...o,
          success: false,
          executed: false,
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        user_id: user!.id,
        profile_id: null,
        profile_name: "리밸런싱",
        executed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        status: "in_progress",
        total_orders: orders.length,
        success_count: 0,
        fail_count: 0,
        total_buy_amount: simulationResult.total_buy_amount,
        total_sell_amount: simulationResult.total_sell_amount,
        net_cash_change: simulationResult.net_cash_change,
        orders: JSON.parse(JSON.stringify(orders)),
        portfolio_snapshot: JSON.parse(JSON.stringify(portfolioSnapshot)),
      };
      if (presetName) {
        insertPayload.preset_name = presetName;
      }

      const { data, error } = await supabase
        .from("executions")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) {
        const msg = error.message || `DB error ${error.code}: ${error.details}`;
        throw new Error(msg);
      }
      return data.id;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // 주문 토글 (optimistic update)
  const toggleMutation = useMutation({
    mutationFn: async ({
      executionId,
      stockCode,
      executed,
    }: {
      executionId: string;
      stockCode: string;
      executed: boolean;
    }) => {
      const { data, error } = await rpc.rpc("toggle_execution_order", {
        p_execution_id: executionId,
        p_stock_code: stockCode,
        p_executed: executed,
      });
      if (error) throw error;
      return data as unknown as ExecutionOrderResult[];
    },
    onMutate: async ({ executionId, stockCode, executed }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["execution", executionId],
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData<RebalanceExecution | null>([
        "execution",
        executionId,
      ]);

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<RebalanceExecution>(
          ["execution", executionId],
          {
            ...previous,
            orders: previous.orders.map((o) =>
              o.stock_code === stockCode
                ? {
                    ...o,
                    executed,
                    executed_at: executed
                      ? new Date().toISOString()
                      : undefined,
                  }
                : o
            ),
          }
        );
      }

      return { previous, executionId };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["execution", context.executionId],
          context.previous
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["execution", vars.executionId],
      });
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
    },
  });

  // 세션 완료
  const completeMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await rpc.rpc("complete_rebalance_session", {
        p_execution_id: executionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // 세션 포기
  const abandonMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await rpc.rpc("abandon_rebalance_session", {
        p_execution_id: executionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // Progress 계산
  function getProgress(orders: ExecutionOrderResult[]) {
    const total = orders.length;
    const completed = orders.filter((o) => o.executed).length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  const startSession = useCallback(
    (params: StartSessionParams) => startMutation.mutateAsync(params),
    [startMutation]
  );

  const toggleOrder = useCallback(
    (executionId: string, stockCode: string, executed: boolean) =>
      toggleMutation.mutate({ executionId, stockCode, executed }),
    [toggleMutation]
  );

  const completeSession = useCallback(
    (executionId: string) => completeMutation.mutateAsync(executionId),
    [completeMutation]
  );

  const abandonSession = useCallback(
    (executionId: string) => abandonMutation.mutateAsync(executionId),
    [abandonMutation]
  );

  return {
    activeSession,
    isLoadingSession,
    refetchActiveSession,
    useSession,
    startSession,
    toggleOrder,
    completeSession,
    abandonSession,
    getProgress,
    isStarting: startMutation.isPending,
    isToggling: toggleMutation.isPending,
    isCompleting: completeMutation.isPending,
    isAbandoning: abandonMutation.isPending,
  };
}

// DB row → RebalanceExecution 매핑
function mapExecution(row: Record<string, unknown>): RebalanceExecution {
  return {
    id: row.id as string,
    profile_id: (row.profile_id as string) ?? "",
    profile_name: row.profile_name as string,
    preset_name: (row.preset_name as string | null) ?? undefined,
    executed_at: row.executed_at as string,
    started_at: (row.started_at as string | null) ?? undefined,
    completed_at: (row.completed_at as string | null) ?? undefined,
    status: row.status as RebalanceExecution["status"],
    total_orders: Number(row.total_orders),
    success_count: Number(row.success_count),
    fail_count: Number(row.fail_count),
    total_buy_amount: Number(row.total_buy_amount),
    total_sell_amount: Number(row.total_sell_amount),
    net_cash_change: Number(row.net_cash_change),
    orders:
      (row.orders as unknown as RebalanceExecution["orders"]) ?? [],
    portfolio_snapshot:
      (row.portfolio_snapshot as unknown as RebalanceExecution["portfolio_snapshot"]) ??
      undefined,
  };
}
