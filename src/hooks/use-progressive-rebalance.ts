"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { toast } from "sonner";
import type {
  RebalanceExecution,
  ExecutionOrderResult,
  PortfolioSnapshot,
} from "@/lib/rebalance/history-types";
import type { RebalanceResult } from "@/lib/rebalance/types";

export type MutationOrigin = "stepper" | "input" | "fill" | "batch";

export interface PendingOrder {
  opId: number;
  quantity: number;
  origin: MutationOrigin;
  timestamp: number;
}

const PENDING_TTL_MS = 10_000; // 10s safety TTL

interface StartSessionParams {
  simulationResult: RebalanceResult;
  portfolioSnapshot: PortfolioSnapshot;
  stockCurrencies?: Map<string, string>; // stock_code -> "KRW" | "USD"
}

export function useProgressiveRebalance(portfolioId: string | null) {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);

  const activeSessionKey = useMemo(() => ["active-session", portfolioId], [portfolioId]);
  const activeSessionAnyKey = useMemo(() => ["active-session-any"], []);
  const historyKey = useMemo(() => ["history", effectiveUserId], [effectiveUserId]);
  const manualPortfolioKey = useMemo(() => ["manual-portfolio", portfolioId], [portfolioId]);

  // "Latest wins" counter for mutation cancellation per stock_code+side
  const mutationCounterRef = useRef<Map<string, number>>(new Map());

  // Pending orders: tracks in-flight mutations to protect display from stale refetches
  const [pendingOrders, setPendingOrders] = useState<Map<string, PendingOrder>>(new Map());

  // Auto-save indicator: tracks when the last successful save occurred
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 활성 세션 조회 (계좌별)
  const {
    data: activeSession,
    isLoading: isLoadingSession,
    refetch: refetchActiveSession,
  } = useQuery({
    queryKey: activeSessionKey,
    enabled: (!!user || isGuest) && !!portfolioId,
    staleTime: 30_000,
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
      const { simulationResult, portfolioSnapshot, stockCurrencies } = params;
      const orders: ExecutionOrderResult[] = simulationResult.orders.map(
        (o) => ({
          ...o,
          success: false,
          executed: false,
          executed_quantity: 0,
          currency: stockCurrencies?.get(o.stock_code) ?? "KRW",
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
      queryClient.invalidateQueries({ queryKey: activeSessionAnyKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // 체결 수량 업데이트 (optimistic update + latest wins pattern)
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      executionId,
      stockCode,
      side,
      executedQuantity,
      actualPrice,
      callId,
    }: {
      executionId: string;
      stockCode: string;
      side: string;
      executedQuantity: number;
      actualPrice?: number;
      callId: number;
    }) => {
      const rpcParams = {
        p_execution_id: executionId,
        p_stock_code: stockCode,
        p_executed_quantity: executedQuantity,
        p_actual_price: actualPrice ?? null,
        p_side: side,
      };
      const { data, error } = await client.rpc("update_execution_order", rpcParams);
      if (error) throw error;
      return { orders: data as unknown as ExecutionOrderResult[], callId, stockCode, side };
    },
    onMutate: async ({ stockCode, side, executedQuantity, actualPrice }) => {
      await queryClient.cancelQueries({
        queryKey: activeSessionKey,
      });

      const previous = queryClient.getQueryData<RebalanceExecution | null>(activeSessionKey);

      if (previous) {
        queryClient.setQueryData<RebalanceExecution>(activeSessionKey, {
          ...previous,
          orders: previous.orders.map((o) =>
            o.stock_code === stockCode && o.side === side
              ? {
                  ...o,
                  executed_quantity: executedQuantity,
                  executed: executedQuantity > 0,
                  executed_at: executedQuantity > 0
                    ? new Date().toISOString()
                    : undefined,
                  ...(actualPrice != null ? { actual_price: actualPrice, actual_amount: executedQuantity * actualPrice } : {}),
                }
              : o
          ),
        });
      }

      return { previous };
    },
    onError: (err, vars, context) => {
      console.error("[Rebalance] updateOrderQuantity failed:", vars.stockCode, err);
      if (context?.previous) {
        queryClient.setQueryData(activeSessionKey, context.previous);
      }
      // Clear pending immediately on error (mutation failed, value not saved)
      const orderKey = `${vars.stockCode}-${vars.side}`;
      setPendingOrders((prev) => {
        const next = new Map(prev);
        next.delete(orderKey);
        return next;
      });
      toast.error("저장에 실패했습니다. 네트워크를 확인해주세요.");
    },
    onSuccess: (_data, vars) => {
      setLastSavedAt(new Date());
      // Clear pending after refetch has time to complete with confirmed data
      const orderKey = `${vars.stockCode}-${vars.side}`;
      const currentCount = mutationCounterRef.current.get(orderKey) ?? 0;
      if (vars.callId === currentCount) {
        setTimeout(() => {
          setPendingOrders((prev) => {
            const pending = prev.get(orderKey);
            if (pending && pending.opId === vars.callId) {
              const next = new Map(prev);
              next.delete(orderKey);
              return next;
            }
            return prev;
          });
        }, 3000);
      }
    },
    onSettled: (_data, _err, vars) => {
      // Only invalidate if this is still the latest call for this stock+side
      const orderKey = `${vars.stockCode}-${vars.side}`;
      const currentCount = mutationCounterRef.current.get(orderKey) ?? 0;
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
      queryClient.invalidateQueries({ queryKey: activeSessionAnyKey });
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
      queryClient.invalidateQueries({ queryKey: activeSessionAnyKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // 부분완료 세션 재개
  const resumeMutation = useMutation({
    mutationFn: async (executionId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client.rpc as any)("resume_rebalance_session", {
        p_execution_id: executionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: activeSessionAnyKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // 최근 부분완료 세션 조회
  const {
    data: latestPartialSession,
  } = useQuery({
    queryKey: ["partial-session", portfolioId],
    enabled: (!!user || isGuest) && !!portfolioId && !activeSession,
    staleTime: 0,
    queryFn: async (): Promise<RebalanceExecution | null> => {
      const { data, error } = await client
        .from("executions")
        .select("*")
        .eq("portfolio_id", portfolioId!)
        .eq("status", "partial")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapExecution(data);
    },
  });

  // 잔여 주문 재계산
  const recalculateMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const res = await fetch("/api/rebalance/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execution_id: executionId, portfolio_id: portfolioId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "잔여 주문 재계산에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  // Progress 계산 (전량 체결된 주문만 completed로 카운트)
  function getProgress(orders: ExecutionOrderResult[]) {
    const total = orders.filter((o) => !o.resolved_by_recalc).length;
    const completed = orders.filter((o) => {
      if (o.resolved_by_recalc) return false;
      if (o.over_executed) return true;
      if (o.executed_quantity !== undefined) return o.executed_quantity >= o.quantity;
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
    (executionId: string, stockCode: string, side: string, executedQuantity: number, actualPrice?: number, origin: MutationOrigin = "stepper") => {
      // Increment counter for this stock+side (latest wins pattern)
      const orderKey = `${stockCode}-${side}`;
      const prev = mutationCounterRef.current.get(orderKey) ?? 0;
      const callId = prev + 1;
      mutationCounterRef.current.set(orderKey, callId);

      // Track pending to protect display from stale refetches
      setPendingOrders((m) => {
        const next = new Map(m);
        next.set(orderKey, { opId: callId, quantity: executedQuantity, origin, timestamp: Date.now() });
        return next;
      });

      updateQuantityMutation.mutate({ executionId, stockCode, side, executedQuantity, actualPrice, callId });
    },
    [updateQuantityMutation]
  );

  // Backward compat wrapper
  const toggleOrder = useCallback(
    (executionId: string, stockCode: string, executed: boolean, side: string = "buy") => {
      if (!activeSession) return;
      const order = activeSession.orders.find((o) => o.stock_code === stockCode && o.side === side);
      const qty = executed ? (order?.quantity ?? 0) : 0;
      updateOrderQuantity(executionId, stockCode, side, qty);
    },
    [activeSession, updateOrderQuantity]
  );

  // 배치 전량 체결 (단일 optimistic update + 병렬 RPC + 단일 캐시 무효화)
  const batchFillOrders = useCallback(
    async (
      executionId: string,
      ordersToFill: Array<{ stock_code: string; side: string; quantity: number }>
    ) => {
      if (ordersToFill.length === 0) return;

      // Set pending for all orders being filled
      const now = Date.now();
      setPendingOrders((prev) => {
        const next = new Map(prev);
        for (const o of ordersToFill) {
          const orderKey = `${o.stock_code}-${o.side}`;
          const opId = (mutationCounterRef.current.get(orderKey) ?? 0) + 1;
          mutationCounterRef.current.set(orderKey, opId);
          next.set(orderKey, { opId, quantity: o.quantity, origin: "batch", timestamp: now });
        }
        return next;
      });

      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: activeSessionKey });

      // Single optimistic update for all orders
      const previous = queryClient.getQueryData<RebalanceExecution | null>(activeSessionKey);
      if (previous) {
        // Create a set or map keyed by stock_code + side
        const fillMap = new Map(ordersToFill.map((o) => [`${o.stock_code}-${o.side}`, o.quantity]));
        queryClient.setQueryData<RebalanceExecution>(activeSessionKey, {
          ...previous,
          orders: previous.orders.map((o) =>
            fillMap.has(`${o.stock_code}-${o.side}`)
              ? {
                  ...o,
                  executed_quantity: fillMap.get(`${o.stock_code}-${o.side}`)!,
                  executed: true,
                  executed_at: new Date().toISOString(),
                }
              : o
          ),
        });
      }

      // Fire all RPCs in parallel
      const results = await Promise.allSettled(
        ordersToFill.map((o) =>
          client.rpc("update_execution_order", {
            p_execution_id: executionId,
            p_stock_code: o.stock_code,
            p_executed_quantity: o.quantity,
            p_actual_price: null,
            p_side: o.side,
          })
        )
      );

      // Rollback on any failure
      const hasError = results.some((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error));
      if (hasError && previous) {
        queryClient.setQueryData(activeSessionKey, previous);
        // Clear pending on rollback
        setPendingOrders((prev) => {
          const next = new Map(prev);
          for (const o of ordersToFill) next.delete(`${o.stock_code}-${o.side}`);
          return next;
        });
      }

      // Single cache invalidation
      queryClient.invalidateQueries({ queryKey: activeSessionKey });

      // Update auto-save indicator on successful batch
      if (!hasError) {
        setLastSavedAt(new Date());
      }

      // Clear pending after refetch settles
      if (!hasError) {
        setTimeout(() => {
          setPendingOrders((prev) => {
            const next = new Map(prev);
            let changed = false;
            for (const o of ordersToFill) {
              const orderKey = `${o.stock_code}-${o.side}`;
              const pending = next.get(orderKey);
              if (pending && pending.origin === "batch" && pending.timestamp === now) {
                next.delete(orderKey);
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }, 3000);
      }
    },
    [activeSessionKey, client, queryClient]
  );

  const completeSession = useCallback(
    (executionId: string) => completeMutation.mutateAsync(executionId),
    [completeMutation]
  );

  const abandonSession = useCallback(
    (executionId: string) => abandonMutation.mutateAsync(executionId),
    [abandonMutation]
  );

  const recalculateRemaining = useCallback(
    (executionId: string) => recalculateMutation.mutateAsync(executionId),
    [recalculateMutation]
  );

  const resumeSession = useCallback(
    (executionId: string) => resumeMutation.mutateAsync(executionId),
    [resumeMutation]
  );

  // TTL-based safety cleanup: clear any pending entries older than PENDING_TTL_MS
  useEffect(() => {
    if (pendingOrders.size === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setPendingOrders((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [stockCode, pending] of next) {
          if (now - pending.timestamp > PENDING_TTL_MS) {
            next.delete(stockCode);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [pendingOrders.size]);

  return {
    activeSession,
    isLoadingSession,
    refetchActiveSession,
    useSession,
    startSession,
    updateOrderQuantity,
    pendingOrders,
    toggleOrder,
    batchFillOrders,
    completeSession,
    abandonSession,
    recalculateRemaining,
    resumeSession,
    latestPartialSession: latestPartialSession ?? null,
    getProgress,
    lastSavedAt,
    isSaving: updateQuantityMutation.isPending,
    isStarting: startMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isToggling: updateQuantityMutation.isPending,
    isCompleting: completeMutation.isPending,
    isAbandoning: abandonMutation.isPending,
    isRecalculating: recalculateMutation.isPending,
    isResuming: resumeMutation.isPending,
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
    recalculated_at: (row.recalculated_at as string | null) ?? undefined,
    recalculation_count: row.recalculation_count != null ? Number(row.recalculation_count) : undefined,
    recalculated_prices: (row.recalculated_prices as Record<string, number> | null) ?? undefined,
  };
}
