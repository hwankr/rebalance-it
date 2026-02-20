"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Lock, Mail, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-notification-preferences";
import { useSubscription } from "@/hooks/use-subscription";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { getReportIntervalLabel } from "@/lib/notification/next-check";

export function NotificationSettingsCard() {
  const { isGuest } = useGuestMode();
  const { isPlusOrAbove } = useSubscription();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  if (isGuest) return null;

  async function handleToggle(
    field: "notification_enabled" | "monthly_report_enabled",
    value: boolean,
  ) {
    // notification_enabled 토글 시 email_enabled도 동기화
    const updates = field === "notification_enabled"
      ? { notification_enabled: value, email_enabled: value }
      : { [field]: value };
    updateMutation.mutate(
      updates,
      {
        onSuccess: () => toast.success("알림 설정이 저장되었습니다."),
        onError: () => toast.error("알림 설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" />
          이메일 알림
        </CardTitle>
        <CardDescription>리밸런싱 관련 이메일 알림 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 리밸런싱 알림 */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">리밸런싱 알림</p>
            <p className="text-xs text-muted-foreground">드리프트 임계치 초과 시 알림</p>
          </div>
          <Switch
            checked={prefs?.notification_enabled ?? true}
            disabled={isLoading || updateMutation.isPending}
            onCheckedChange={(checked) => handleToggle("notification_enabled", checked)}
          />
        </div>

        {/* 월간 리포트 */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">월간 리포트</p>
            <p className="text-xs text-muted-foreground">
              {getReportIntervalLabel({
                intervalType: prefs?.report_interval_type ?? "monthly",
                dayOfWeek: prefs?.report_day_of_week,
                dayOfMonth: prefs?.report_day_of_month,
                customDays: prefs?.report_custom_days,
              })} 포트폴리오 현황 리포트
            </p>
            {!isPlusOrAbove && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Lock className="size-3" />
                Plus 플랜에서 사용 가능
              </p>
            )}
          </div>
          <Switch
            checked={isPlusOrAbove ? (prefs?.monthly_report_enabled ?? false) : false}
            disabled={!isPlusOrAbove || isLoading || updateMutation.isPending}
            onCheckedChange={(checked) => handleToggle("monthly_report_enabled", checked)}
          />
        </div>

        {/* 상세 설정 링크 */}
        <div className="pt-1">
          <Button variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/settings/notifications">
              상세 설정
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
