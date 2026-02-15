"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { StockTarget, PresetTarget } from "@/lib/rebalance/preset-types";
import type { TargetAllocation } from "@/lib/rebalance/types";

export function useStockTargets() {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["stock-targets", effectiveUserId];

  const { data: targets = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<StockTarget[]> => {
      const { data, error } = await client
        .from("stock_targets")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        stock_code: row.stock_code,
        stock_name: row.stock_name,
        target_pct: Number(row.target_pct),
      }));
    },
  });

  const setTargetMutation = useMutation({
    mutationFn: async ({
      stockCode,
      stockName,
      targetPct,
    }: {
      stockCode: string;
      stockName: string;
      targetPct: number;
    }) => {
      const { error } = await client
        .from("stock_targets")
        .upsert(
          {
            user_id: effectiveUserId,
            stock_code: stockCode,
            stock_name: stockName,
            target_pct: targetPct,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id,stock_code" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeTargetMutation = useMutation({
    mutationFn: async (stockCode: string) => {
      const { error } = await client
        .from("stock_targets")
        .delete()
        .eq("user_id", effectiveUserId!)
        .eq("stock_code", stockCode);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const applyPresetMutation = useMutation({
    mutationFn: async (presetTargets: PresetTarget[]) => {
      const { error } = await client.rpc("apply_preset_to_targets", {
        p_user_id: effectiveUserId,
        p_targets: JSON.parse(JSON.stringify(presetTargets)),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setTarget = useCallback(
    (stockCode: string, stockName: string, targetPct: number) => {
      setTargetMutation.mutate({ stockCode, stockName, targetPct });
    },
    [setTargetMutation],
  );

  const removeTarget = useCallback(
    (stockCode: string) => {
      removeTargetMutation.mutate(stockCode);
    },
    [removeTargetMutation],
  );

  const applyPreset = useCallback(
    (presetTargets: PresetTarget[]) => {
      applyPresetMutation.mutate(presetTargets);
    },
    [applyPresetMutation],
  );

  const getTargetsAsAllocations = useCallback((): TargetAllocation[] => {
    return targets
      .filter((t) => t.target_pct > 0)
      .map((t) => ({
        stock_code: t.stock_code,
        stock_name: t.stock_name,
        target_pct: t.target_pct,
      }));
  }, [targets]);

  return {
    targets,
    isLoading,
    setTarget,
    removeTarget,
    applyPreset,
    getTargetsAsAllocations,
    isApplying: applyPresetMutation.isPending,
  };
}
