"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface AppSettings {
  account: string;
  isConnected: boolean;
}

const SETTINGS_ROW_KEY = "app_settings";
const DEFAULT_SETTINGS: AppSettings = { account: "", isConnected: false };

export function useSettings() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ["settings", user?.id];

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", SETTINGS_ROW_KEY)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      return {
        ...DEFAULT_SETTINGS,
        ...(data.value as Record<string, unknown>),
      } as AppSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<AppSettings>) => {
      const newSettings = { ...settings, ...partial };
      const { error } = await supabase
        .from("settings")
        .upsert(
          {
            user_id: user!.id,
            key: SETTINGS_ROW_KEY,
            value: JSON.parse(JSON.stringify(newSettings)),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("settings")
        .delete()
        .eq("key", SETTINGS_ROW_KEY)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      updateMutation.mutate(partial);
    },
    [updateMutation]
  );

  const clearSettings = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  return { settings, isLoading, updateSettings, clearSettings };
}
