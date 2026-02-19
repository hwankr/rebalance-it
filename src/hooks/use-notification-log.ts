"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";

export type NotificationStatus = "sent" | "failed" | "pending" | "retrying";
export type NotificationType = "drift_alert" | "monthly_report" | "test";

export interface NotificationLogEntry {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  status: NotificationStatus;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

const QUERY_KEY = ["notification-log"];

export function useNotificationLog(limit = 10) {
  const { user } = useAuth();
  const { isGuest } = useGuestMode();

  const { data, isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, limit],
    enabled: !!user && !isGuest,
    queryFn: async (): Promise<NotificationLogEntry[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("notification_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationLogEntry[];
    },
  });

  return { data: data ?? [], isLoading, error };
}
