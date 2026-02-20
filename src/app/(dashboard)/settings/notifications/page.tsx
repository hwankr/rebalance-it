"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/layout/page-transition";
import { NotificationHistory } from "@/components/notification/notification-history";
import { DriftAlertSettings } from "@/components/notification/drift-alert-settings";
import { ReportScheduleSettings } from "@/components/notification/report-schedule-settings";
import { ReportContentSettings } from "@/components/notification/report-content-settings";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { useNotificationLog } from "@/hooks/use-notification-log";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { PLAN_LIMITS } from "@/lib/subscription/plans";

const COOLDOWN_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "14", label: "14일" },
  { value: "30", label: "30일" },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isPlusOrAbove, plan } = useSubscription();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testType, setTestType] = useState<"test" | "drift" | "monthly" | "drift-real" | "monthly-real" | "weekly-news">("test");

  const historyLimit = PLAN_LIMITS[plan].maxNotificationHistory === Infinity
    ? 50
    : PLAN_LIMITS[plan].maxNotificationHistory;

  useNotificationLog(historyLimit);

  if (isGuest) {
    router.replace("/settings");
    return null;
  }

  function handleToggle(
    field: "notification_enabled" | "monthly_report_enabled" | "weekly_news_enabled",
    value: boolean,
  ) {
    const updates = field === "notification_enabled"
      ? { notification_enabled: value, email_enabled: value }
      : { [field]: value };
    updateMutation.mutate(
      updates,
      {
        onSuccess: () => toast.success("설정이 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  function handleEmailChange(email: string) {
    updateMutation.mutate(
      { email_address: email || null },
      {
        onSuccess: () => toast.success("이메일 주소가 저장되었습니다."),
        onError: () => toast.error("이메일 주소 저장 중 오류가 발생했습니다."),
      },
    );
  }

  function handleCooldownChange(days: string) {
    updateMutation.mutate(
      { cooldown_days: Number(days) },
      {
        onSuccess: () => toast.success("쿨다운 기간이 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  async function handleSendTest(type: "test" | "drift" | "monthly" | "drift-real" | "monthly-real" | "weekly-news") {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/notification/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      const labels = { test: "테스트", drift: "드리프트 알림", monthly: "월간 리포트", "drift-real": "드리프트 알림 (실제)", "monthly-real": "월간 리포트 (실제)", "weekly-news": "주간 종목 뉴스" };
      toast.success(`${labels[type]} 이메일이 발송되었습니다.`);
    } catch {
      toast.error("테스트 이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/settings" className="hover:text-foreground transition-colors">
              설정
            </Link>
            <span>/</span>
            <span className="text-foreground">알림 설정</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            알림 설정
          </h1>
          <p className="text-muted-foreground">이메일 알림 수신 방식을 설정합니다.</p>
        </div>

        {/* 뒤로 가기 */}
        <Button variant="ghost" size="sm" className="gap-1.5 px-0" asChild>
          <Link href="/settings">
            <ArrowLeft className="size-4" />
            설정으로 돌아가기
          </Link>
        </Button>

        {/* 이메일 알림 기본 설정 */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>이메일 알림 설정</CardTitle>
            <CardDescription>알림 수신 방식과 이메일 주소를 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 리밸런싱 알림 토글 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">리밸런싱 알림</Label>
                <p className="text-xs text-muted-foreground">드리프트 임계치 초과 시 이메일 발송</p>
              </div>
              <Switch
                checked={prefs?.notification_enabled ?? true}
                disabled={isLoading || updateMutation.isPending}
                onCheckedChange={(v) => handleToggle("notification_enabled", v)}
              />
            </div>

            {/* 월간 리포트 토글 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  정기 리포트
                  {!isPlusOrAbove && (
                    <span className="ml-2 text-xs text-muted-foreground">(Plus 플랜 필요)</span>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">포트폴리오 현황 리포트 정기 발송</p>
              </div>
              <Switch
                checked={isPlusOrAbove ? (prefs?.monthly_report_enabled ?? false) : false}
                disabled={!isPlusOrAbove || isLoading || updateMutation.isPending}
                onCheckedChange={(v) => handleToggle("monthly_report_enabled", v)}
              />
            </div>

            {/* 주간 종목 뉴스 토글 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  주간 종목 뉴스
                  {!isPlusOrAbove && (
                    <span className="ml-2 text-xs text-muted-foreground">(Plus 플랜 필요)</span>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">관심 종목의 주간 뉴스 요약 브리핑 발송</p>
              </div>
              <Switch
                checked={isPlusOrAbove ? (prefs?.weekly_news_enabled ?? false) : false}
                disabled={!isPlusOrAbove || isLoading || updateMutation.isPending}
                onCheckedChange={(v) => handleToggle("weekly_news_enabled", v)}
              />
            </div>

            {/* 이메일 주소 */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">이메일 주소</Label>
              <Input
                id="email"
                type="email"
                placeholder={user?.email ?? "이메일 주소 입력"}
                defaultValue={prefs?.email_address ?? ""}
                disabled={isLoading}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (prefs?.email_address ?? "")) {
                    handleEmailChange(val);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 가입 시 이메일({user?.email})로 발송됩니다.
              </p>
            </div>

            {/* 쿨다운 기간 */}
            <div className="space-y-1.5">
              <Label htmlFor="cooldown" className="text-sm font-medium">쿨다운 기간</Label>
              <Select
                value={String(prefs?.cooldown_days ?? 7)}
                disabled={isLoading || updateMutation.isPending}
                onValueChange={handleCooldownChange}
              >
                <SelectTrigger id="cooldown" className="w-40">
                  <SelectValue placeholder="7일" />
                </SelectTrigger>
                <SelectContent>
                  {COOLDOWN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                동일한 종류의 알림을 다시 받기까지 대기하는 기간입니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 드리프트 알림 상세 설정 */}
        <DriftAlertSettings
          prefs={prefs}
          isLoading={isLoading}
          updateMutation={updateMutation}
          isPlusOrAbove={isPlusOrAbove}
        />

        {/* 리포트 주기 설정 (월간 리포트 ON 시에만 표시) */}
        <ReportScheduleSettings
          prefs={prefs}
          isLoading={isLoading}
          updateMutation={updateMutation}
          isPlusOrAbove={isPlusOrAbove}
        />

        {/* 리포트 내용 설정 (월간 리포트 ON 시에만 표시) */}
        <ReportContentSettings
          prefs={prefs}
          isLoading={isLoading}
          updateMutation={updateMutation}
          isPlusOrAbove={isPlusOrAbove}
        />

        {/* 테스트 알림 */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>테스트 알림</CardTitle>
            <CardDescription>실제 알림과 동일한 형태의 테스트 이메일을 보냅니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">알림 유형</Label>
              <Select
                value={testType}
                onValueChange={(v) => setTestType(v as "test" | "drift" | "monthly")}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">기본 테스트</SelectItem>
                  <SelectItem value="drift">드리프트 알림 (예시 데이터)</SelectItem>
                  <SelectItem value="monthly">월간 리포트 (예시 데이터)</SelectItem>
                  <SelectItem value="weekly-news">주간 종목 뉴스 (예시 데이터)</SelectItem>
                  <SelectItem value="drift-real">드리프트 알림 (내 포트폴리오)</SelectItem>
                  <SelectItem value="monthly-real">월간 리포트 (내 포트폴리오)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {testType === "test" && "간단한 연결 테스트 이메일을 보냅니다."}
                {testType === "drift" && "포트폴리오 드리프트 초과 시 발송되는 알림 예시입니다."}
                {testType === "monthly" && "매월 1일 발송되는 포트폴리오 리포트 예시입니다."}
                {testType === "weekly-news" && "매주 발송되는 종목 뉴스 브리핑 예시입니다."}
                {testType === "drift-real" && "내 실제 포트폴리오 데이터로 드리프트 알림을 생성합니다."}
                {testType === "monthly-real" && "내 실제 포트폴리오 데이터로 월간 리포트를 생성합니다."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleSendTest(testType)}
              disabled={isSendingTest}
              className="gap-2"
            >
              {isSendingTest && <Loader2 className="size-4 animate-spin" />}
              테스트 이메일 보내기
            </Button>
          </CardContent>
        </Card>

        {/* 알림 히스토리 */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>알림 히스토리</CardTitle>
            <CardDescription>
              최근 발송된 알림 목록입니다.
              {PLAN_LIMITS[plan].maxNotificationHistory !== Infinity && (
                <span className="ml-1">
                  (최대 {PLAN_LIMITS[plan].maxNotificationHistory}건)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationHistory limit={historyLimit} />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
