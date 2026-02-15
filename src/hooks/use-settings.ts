"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorageClient } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";

export interface AppSettings {
  account: string;
  isConnected: boolean;
}

const SETTINGS_ROW_KEY = "app_settings";
const DEFAULT_SETTINGS: AppSettings = { account: "", isConnected: false };

export function useSettings() {
  const client = useStorageClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const effectiveUserId = user?.id ?? (isGuest ? "guest" : null);
  const queryKey = ["settings", effectiveUserId];

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey,
    enabled: !!user || isGuest,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await client
        .from("settings")
        .select("value")
        .eq("key", SETTINGS_ROW_KEY)
        .eq("user_id", effectiveUserId!)
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
      const { error } = await client
        .from("settings")
        .upsert(
          {
            user_id: effectiveUserId,
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
      const { error } = await client
        .from("settings")
        .delete()
        .eq("key", SETTINGS_ROW_KEY)
        .eq("user_id", effectiveUserId!);
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
