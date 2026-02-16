"use client";

import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
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

export function useProgressiveRebalance(portfolioId: string | null) {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);

  const activeSessionKey = ["active-session", portfolioId];
  const historyKey = ["history", effectiveUserId];
  const manualPortfolioKey = ["manual-portfolio", portfolioId];

  // "Latest wins" counter for mutation cancellation per stock_code
  const mutationCounterRef = useRef<Map<string, number>>(new Map());

  // 활성 세션 조회 (계좌별)
  const {
    data: activeSession,
    isLoading: isLoadingSession,
    refetch: refetchActiveSession,
  } = useQuery({
    queryKey: activeSessionKey,
    enabled: (!!user || isGuest) && !!portfolioId,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<RebalanceExecution | null> => {
      const { data, error } = await client
        .from("executions")
        .select("*")
        .eq("portfolio_id", portfolioId!)
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
      enabled: !!executionId && (!!user || isGuest),
      queryFn: async (): Promise<RebalanceExecution | null> => {
        const { data, error } = await client
          .from("executions")
          .select("*")
          .eq("id", executionId!)
          .eq("user_id", effectiveUserId!)
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
      if (!portfolioId) throw new Error("계좌가 선택되지 않았습니다");
      const { simulationResult, portfolioSnapshot, presetName } = params;
      const orders: ExecutionOrderResult[] = simulationResult.orders.map(
        (o) => ({
          ...o,
          success: false,
          executed: false,
          executed_quantity: 0,
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        user_id: effectiveUserId!,
        portfolio_id: portfolioId,
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

      const { data, error } = await client
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

  // 체결 수량 업데이트 (optimistic update + latest wins pattern)
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      executionId,
      stockCode,
      executedQuantity,
      callId,
    }: {
      executionId: string;
      stockCode: string;
      executedQuantity: number;
      callId: number;
    }) => {
      const { data, error } = await client.rpc("update_execution_order", {
        p_execution_id: executionId,
        p_stock_code: stockCode,
        p_executed_quantity: executedQuantity,
      });
      if (error) throw error;
      return { orders: data as unknown as ExecutionOrderResult[], callId, stockCode };
    },
    onMutate: async ({ stockCode, executedQuantity }) => {
      await queryClient.cancelQueries({
        queryKey: activeSessionKey,
      });

      const previous = queryClient.getQueryData<RebalanceExecution | null>(activeSessionKey);

      if (previous) {
        queryClient.setQueryData<RebalanceExecution>(activeSessionKey, {
          ...previous,
          orders: previous.orders.map((o) =>
            o.stock_code === stockCode
              ? {
                  ...o,
                  executed_quantity: executedQuantity,
                  executed: executedQuantity > 0,
                  executed_at: executedQuantity > 0
                    ? new Date().toISOString()
                    : undefined,
                }
              : o
          ),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(activeSessionKey, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      // Only invalidate if this is still the latest call for this stock
      const currentCount = mutationCounterRef.current.get(vars.stockCode) ?? 0;
      if (vars.callId === currentCount) {
        queryClient.invalidateQueries({ queryKey: activeSessionKey });
      }
    },
  });

  // 세션 완료 (포트폴리오 자동 업데이트 포함)
  const completeMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await client.rpc("complete_rebalance_session", {
        p_execution_id: executionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
      // 포트폴리오 캐시 무효화 (자산 업데이트 반영)
      queryClient.invalidateQueries({ queryKey: manualPortfolioKey });
    },
    onError: (error) => {
      console.error("[Rebalance] completeSession failed:", error);
    },
  });

  // 세션 포기
  const abandonMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await client.rpc("abandon_rebalance_session", {
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
    const completed = orders.filter((o) => {
      if (o.executed_quantity !== undefined) return o.executed_quantity > 0;
      return o.executed === true;
    }).length;
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

  const updateOrderQuantity = useCallback(
    (executionId: string, stockCode: string, executedQuantity: number) => {
      // Increment counter for this stock (latest wins pattern)
      const prev = mutationCounterRef.current.get(stockCode) ?? 0;
      const callId = prev + 1;
      mutationCounterRef.current.set(stockCode, callId);

      updateQuantityMutation.mutate({ executionId, stockCode, executedQuantity, callId });
    },
    [updateQuantityMutation]
  );

  // Backward compat wrapper
  const toggleOrder = useCallback(
    (executionId: string, stockCode: string, executed: boolean) => {
      if (!activeSession) return;
      const order = activeSession.orders.find((o) => o.stock_code === stockCode);
      const qty = executed ? (order?.quantity ?? 0) : 0;
      updateOrderQuantity(executionId, stockCode, qty);
    },
    [activeSession, updateOrderQuantity]
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
    updateOrderQuantity,
    toggleOrder,
    completeSession,
    abandonSession,
    getProgress,
    isStarting: startMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isToggling: updateQuantityMutation.isPending,
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
