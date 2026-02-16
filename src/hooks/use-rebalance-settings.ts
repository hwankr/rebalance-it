"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { RebalanceSettings } from "@/lib/rebalance/settings-types";

const DEFAULT_SETTINGS: Omit<RebalanceSettings, "id"> = {
  strategy: "threshold",
  threshold_pct: 5,
  calendar_interval: undefined,
};

export function useRebalanceSettings() {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["rebalance-settings", effectiveUserId];

  const { data: settings, isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<RebalanceSettings> => {
      const { data, error } = await client
        .from("rebalance_settings")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { ...DEFAULT_SETTINGS, id: "" };
      }
      return {
        id: data.id,
        strategy: data.strategy as RebalanceSettings["strategy"],
        threshold_pct: Number(data.threshold_pct),
        calendar_interval:
          (data.calendar_interval as RebalanceSettings["calendar_interval"]) ??
          undefined,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (
      updates: Partial<
        Pick<RebalanceSettings, "strategy" | "threshold_pct" | "calendar_interval">
      >,
    ) => {
      const { error } = await client
        .from("rebalance_settings")
        .upsert(
          {
            user_id: effectiveUserId,
            ...updates,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateSettings = useCallback(
    (
      updates: Partial<
        Pick<RebalanceSettings, "strategy" | "threshold_pct" | "calendar_interval">
      >,
    ) => {
      updateMutation.mutate(updates);
    },
    [updateMutation],
  );

  return {
    settings: settings ?? { ...DEFAULT_SETTINGS, id: "" },
    isLoading,
    updateSettings,
    isSaving: updateMutation.isPending,
  };
}
