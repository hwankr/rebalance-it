"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";

export interface ReportSections {
  summary: boolean;
  portfolios: boolean;
  drift_table: boolean;
  activity: boolean;
}

export interface NotificationPreferences {
  user_id: string;
  notification_enabled: boolean;
  email_enabled: boolean;
  monthly_report_enabled: boolean;
  weekly_news_enabled: boolean;
  email_address: string | null;
  cooldown_days: number;
  // Phase 1: 드리프트 알림 세부 설정
  alert_threshold_pct: number | null;
  alert_severity: "all" | "major_only";
  alert_mode: "individual" | "digest";
  excluded_portfolio_ids: string[];
  // Phase 2: 리포트 주기 설정
  report_interval_type: "weekly" | "biweekly" | "monthly" | "custom";
  report_custom_days: number | null;
  report_day_of_week: number | null;
  report_day_of_month: number | null;
  report_next_send_at: string | null;
  // Phase 3: 리포트 콘텐츠 설정
  report_sections: ReportSections;
  updated_at?: string;
}

const reportSectionsSchema = z.object({
  summary: z.boolean(),
  portfolios: z.boolean(),
  drift_table: z.boolean(),
  activity: z.boolean(),
});

/** DB에서 읽어온 report_sections JSONB를 안전하게 파싱 */
export function parseReportSections(raw: unknown): ReportSections {
  const result = reportSectionsSchema.safeParse(raw);
  if (result.success) return result.data;
  return { summary: true, portfolios: true, drift_table: true, activity: true };
}

const DEFAULT_REPORT_SECTIONS: ReportSections = {
  summary: true,
  portfolios: true,
  drift_table: true,
  activity: true,
};

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "user_id"> = {
  notification_enabled: false,
  email_enabled: true,
  monthly_report_enabled: false,
  weekly_news_enabled: false,
  email_address: null,
  cooldown_days: 7,
  alert_threshold_pct: null,
  alert_severity: "all",
  alert_mode: "individual",
  excluded_portfolio_ids: [],
  report_interval_type: "monthly",
  report_custom_days: null,
  report_day_of_week: null,
  report_day_of_month: null,
  report_next_send_at: null,
  report_sections: DEFAULT_REPORT_SECTIONS,
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
      return {
        ...data,
        report_sections: parseReportSections(data.report_sections),
      } as NotificationPreferences;
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
