"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationPreferences } from "@/hooks/use-notification-preferences";
import type { UseMutationResult } from "@tanstack/react-query";
import { calculateNextReportAt } from "@/lib/notification/next-check";

const DAY_OF_WEEK_OPTIONS = [
  { value: "0", label: "일요일" },
  { value: "1", label: "월요일" },
  { value: "2", label: "화요일" },
  { value: "3", label: "수요일" },
  { value: "4", label: "목요일" },
  { value: "5", label: "금요일" },
  { value: "6", label: "토요일" },
];

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}일`,
}));

interface ReportScheduleSettingsProps {
  prefs: NotificationPreferences | null;
  isLoading: boolean;
  updateMutation: UseMutationResult<void, Error, Partial<Omit<NotificationPreferences, "user_id">>>;
  isPlusOrAbove: boolean;
}

export function ReportScheduleSettings({
  prefs,
  isLoading,
  updateMutation,
  isPlusOrAbove,
}: ReportScheduleSettingsProps) {
  const intervalType = prefs?.report_interval_type ?? "monthly";
  const isDisabled = !isPlusOrAbove || isLoading || updateMutation.isPending;

  function handleUpdate(updates: Partial<Omit<NotificationPreferences, "user_id">>) {
    const newIntervalType = (updates.report_interval_type ?? intervalType) as "weekly" | "biweekly" | "monthly" | "custom";
    const nextSendAt = calculateNextReportAt({
      intervalType: newIntervalType,
      dayOfWeek: updates.report_day_of_week !== undefined ? updates.report_day_of_week : prefs?.report_day_of_week,
      dayOfMonth: updates.report_day_of_month !== undefined ? updates.report_day_of_month : prefs?.report_day_of_month,
      customDays: updates.report_custom_days !== undefined ? updates.report_custom_days : prefs?.report_custom_days,
    });

    updateMutation.mutate(
      {
        ...updates,
        report_next_send_at: nextSendAt.toISOString(),
      },
      {
        onSuccess: () => toast.success("리포트 주기가 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  function handleIntervalChange(value: string) {
    const updates: Partial<Omit<NotificationPreferences, "user_id">> = {
      report_interval_type: value as NotificationPreferences["report_interval_type"],
    };
    if (value === "weekly" || value === "biweekly") {
      updates.report_day_of_week = prefs?.report_day_of_week ?? 1;
      updates.report_day_of_month = null;
      updates.report_custom_days = null;
    } else if (value === "monthly") {
      updates.report_day_of_month = prefs?.report_day_of_month ?? 1;
      updates.report_day_of_week = null;
      updates.report_custom_days = null;
    } else if (value === "custom") {
      updates.report_custom_days = prefs?.report_custom_days ?? 30;
      updates.report_day_of_week = null;
      updates.report_day_of_month = null;
    }
    handleUpdate(updates);
  }

  const nextSendLabel = prefs?.report_next_send_at
    ? new Date(prefs.report_next_send_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "설정 후 계산됩니다";

  return (
    <div className="space-y-2">
      {/* 주기 + 발송일 */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-muted/50 p-3">
          <div className="text-[11px] text-muted-foreground mb-1.5">주기</div>
          <Select
            value={intervalType}
            disabled={isDisabled}
            onValueChange={handleIntervalChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">매주</SelectItem>
              <SelectItem value="biweekly">격주</SelectItem>
              <SelectItem value="monthly">매월</SelectItem>
              <SelectItem value="custom">커스텀</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 rounded-lg bg-muted/50 p-3">
          <div className="text-[11px] text-muted-foreground mb-1.5">발송일</div>
          {(intervalType === "weekly" || intervalType === "biweekly") && (
            <Select
              value={String(prefs?.report_day_of_week ?? 1)}
              disabled={isDisabled}
              onValueChange={(v) =>
                handleUpdate({ report_day_of_week: Number(v) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_WEEK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {intervalType === "monthly" && (
            <Select
              value={String(prefs?.report_day_of_month ?? 1)}
              disabled={isDisabled}
              onValueChange={(v) =>
                handleUpdate({ report_day_of_month: Number(v) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {intervalType === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={7}
                max={90}
                className="h-8 text-xs"
                defaultValue={prefs?.report_custom_days ?? 30}
                disabled={isDisabled}
                onBlur={(e) => {
                  const num = Number(e.target.value);
                  if (num >= 7 && num <= 90) {
                    handleUpdate({ report_custom_days: num });
                  }
                }}
              />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">일마다</span>
            </div>
          )}
        </div>
      </div>

      {/* 다음 발송 예정일 */}
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        📅 다음 발송 예정일: <span className="font-medium text-foreground">{nextSendLabel}</span>
      </div>
    </div>
  );
}
