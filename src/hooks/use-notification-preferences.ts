"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";

export interface NotificationPreferences {
  user_id: string;
  notification_enabled: boolean;
  email_enabled: boolean;
  monthly_report_enabled: boolean;
  email_address: string | null;
  cooldown_days: number;
  updated_at?: string;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "user_id"> = {
  notification_enabled: false,
  email_enabled: true,
  monthly_report_enabled: false,
  email_address: null,
  cooldown_days: 7,
};

const QUERY_KEY = ["notification-preferences"];

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { isGuest } = useGuestMode();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    enabled: !!user && !isGuest,
    queryFn: async (): Promise<NotificationPreferences> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { ...DEFAULT_PREFERENCES, user_id: user!.id };
      }
      return data as NotificationPreferences;
    },
  });

  return {
    data: data ?? (user ? { ...DEFAULT_PREFERENCES, user_id: user.id } : null),
    isLoading,
    error,
  };
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      updates: Partial<Omit<NotificationPreferences, "user_id">>,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user!.id,
            ...updates,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return mutation;
}
