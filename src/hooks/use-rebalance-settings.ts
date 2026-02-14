"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { RebalanceSettings } from "@/lib/rebalance/preset-types";

const DEFAULT_SETTINGS: Omit<RebalanceSettings, "id"> = {
  data_source: "manual",
  strategy: "threshold",
  threshold_pct: 5,
  calendar_interval: undefined,
};

export function useRebalanceSettings(dataSource: "kiwoom" | "manual") {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ["rebalance-settings", user?.id, dataSource];

  const { data: settings, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<RebalanceSettings> => {
      const { data, error } = await supabase
        .from("rebalance_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("data_source", dataSource)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { ...DEFAULT_SETTINGS, id: "", data_source: dataSource };
      }
      return {
        id: data.id,
        data_source: data.data_source as RebalanceSettings["data_source"],
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
      const { error } = await supabase
        .from("rebalance_settings")
        .upsert(
          {
            user_id: user!.id,
            data_source: dataSource,
            ...updates,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id,data_source" },
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
    settings: settings ?? { ...DEFAULT_SETTINGS, id: "", data_source: dataSource },
    isLoading,
    updateSettings,
    isSaving: updateMutation.isPending,
  };
}
