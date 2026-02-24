"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  FileText,
  Newspaper,
  Mail,
  ChevronDown,
  Settings,
  Send,
  Clock,
  Lock,
  Loader2,
} from "lucide-react";
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
import { PresetSelector } from "@/components/notification/preset-selector";
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
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { cn } from "@/lib/utils";

const COOLDOWN_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "14", label: "14일" },
  { value: "30", label: "30일" },
];


/* ─── Collapsible accordion section ─── */
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/50 mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Settings className="size-4" />
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="pb-2">{children}</div>
      </div>
    </div>
  );
}

/* ─── Summary row for bottom section ─── */
function SummaryRow({
  label,
  value,
  active,
  sub,
}: {
  label: string;
  value: string;
  active: boolean;
  sub?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        sub ? "text-xs" : "text-[13px]",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold font-mono",
          sub ? "text-[11px]" : "text-xs",
          active ? "text-green-500" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Main page ─── */
export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isPlusOrAbove, plan } = useSubscription();
  const { isAdmin } = useProfile();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testType, setTestType] = useState<
    "test" | "drift" | "monthly" | "drift-real" | "monthly-real" | "weekly-news"
  >("test");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const historyLimit =
    PLAN_LIMITS[plan].maxNotificationHistory === Infinity
      ? 50
      : PLAN_LIMITS[plan].maxNotificationHistory;

  useNotificationLog(historyLimit);


  if (isGuest) {
    router.replace("/settings");
    return null;
  }

  const deviationOn = prefs?.notification_enabled ?? true;
  const reportOn = isPlusOrAbove
    ? (prefs?.monthly_report_enabled ?? false)
    : false;
  const newsOn = isPlusOrAbove
    ? (prefs?.weekly_news_enabled ?? false)
    : false;
  const cooldownDays = prefs?.cooldown_days ?? 7;
  const threshold = prefs?.alert_threshold_pct ?? 5;
  const intervalLabel =
    { weekly: "매주", biweekly: "격주", monthly: "매월", custom: "커스텀" }[
      prefs?.report_interval_type ?? "monthly"
    ] ?? "매월";

  /* ── handlers ── */
  function handleToggle(
    field:
      | "notification_enabled"
      | "monthly_report_enabled"
      | "weekly_news_enabled",
    value: boolean,
  ) {
    const updates =
      field === "notification_enabled"
        ? { notification_enabled: value, email_enabled: value }
        : { [field]: value };
    updateMutation.mutate(updates, {
      onSuccess: () => toast.success("설정이 저장되었습니다."),
      onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
    });
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
        onSuccess: () => toast.success("알림 간격이 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  function handleThresholdChange(value: string) {
    updateMutation.mutate(
      { alert_threshold_pct: Number(value) },
      {
        onSuccess: () => toast.success("알림 기준이 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  function handlePresetSelect(id: string) {
    setSelectedPreset(id);
    if (id === "simple") {
      updateMutation.mutate(
        {
          notification_enabled: true,
          email_enabled: true,
          cooldown_days: 7,
          alert_threshold_pct: 5,
        },
        {
          onSuccess: () => {
            toast.success("'간단하게' 설정이 적용되었습니다.");
          },
          onError: () => toast.error("설정 적용 중 오류가 발생했습니다."),
        },
      );
    } else if (id === "thorough") {
      updateMutation.mutate(
        {
          notification_enabled: true,
          email_enabled: true,
          cooldown_days: 3,
          alert_threshold_pct: 3,
        },
        {
          onSuccess: () => {
            toast.success("'꼼꼼하게' 설정이 적용되었습니다.");
          },
          onError: () => toast.error("설정 적용 중 오류가 발생했습니다."),
        },
      );
    }
  }


  async function handleSendTest(
    type:
      | "test"
      | "drift"
      | "monthly"
      | "drift-real"
      | "monthly-real"
      | "weekly-news",
  ) {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/notification/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      const labels = {
        test: "테스트",
        drift: "비중 변동 알림",
        monthly: "정기 리포트",
        "drift-real": "비중 변동 알림 (실제)",
        "monthly-real": "정기 리포트 (실제)",
        "weekly-news": "주간 종목 뉴스",
      };
      toast.success(`${labels[type]} 이메일이 발송되었습니다.`);
    } catch {
      toast.error("테스트 이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-3">
        {/* ── 헤더 ── */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/settings"
              className="hover:text-foreground transition-colors"
            >
              설정
            </Link>
            <span>/</span>
            <span className="text-foreground">알림 설정</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            알림 설정
          </h1>
          <p className="text-sm text-muted-foreground">
            포트폴리오 변동을 이메일로 알려드려요
          </p>
        </div>

        <Button variant="ghost" size="sm" className="gap-1.5 px-0" asChild>
          <Link href="/settings">
            <ArrowLeft className="size-4" />
            설정으로 돌아가기
          </Link>
        </Button>

        {/* ── 빠른 시작 프리셋 ── */}
        <PresetSelector
          selected={selectedPreset}
          onSelect={handlePresetSelect}
          isPending={updateMutation.isPending}
        />

        {/* ── 카드 그리드 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">

        {/* ── 이메일 주소 카드 ── */}
        <div className="md:col-span-2 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="size-4" />
            </div>
            <div>
              <div className="text-sm font-bold">이메일 주소</div>
              <div className="text-xs text-muted-foreground">
                알림을 받을 이메일
              </div>
            </div>
          </div>
          <Input
            type="email"
            placeholder={
              user?.email
                ? `비워두면 ${user.email}로 발송`
                : "이메일 주소 입력"
            }
            defaultValue={prefs?.email_address ?? ""}
            disabled={isLoading}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val !== (prefs?.email_address ?? "")) {
                handleEmailChange(val);
              }
            }}
          />
        </div>

        {/* ── 비중 변동 알림 카드 ── */}
        <div
          className={cn(
            "rounded-xl border bg-card p-4 transition-colors duration-300",
            deviationOn ? "border-primary/25" : "border-border/50",
          )}
        >
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                  deviationOn
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Bell className="size-4" />
              </div>
              <div className="text-sm font-bold">비중 변동 알림</div>
            </div>
            <Switch
              checked={deviationOn}
              disabled={isLoading || updateMutation.isPending}
              onCheckedChange={(v) => handleToggle("notification_enabled", v)}
            />
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            종목의 현재 비중이 목표에서 {threshold}% 이상 벗어나면 알려드려요
          </p>

          {deviationOn && (
            <div className="mt-4 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* 알림 기준 */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <div className="text-sm font-semibold">알림 기준</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    목표 비중 대비 차이
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    className="w-20 h-8 text-sm text-right"
                    defaultValue={threshold}
                    key={threshold}
                    disabled={isLoading || updateMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") {
                        e.preventDefault();
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (isNaN(num) || num < 1 || num > 100) {
                        e.target.value = String(threshold);
                        return;
                      }
                      handleThresholdChange(e.target.value);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {/* 알림 간격 */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <div className="text-sm font-semibold">알림 간격</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    같은 알림을 다시 받기까지
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(cooldownDays)}
                    disabled={isLoading || updateMutation.isPending}
                    onValueChange={handleCooldownChange}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COOLDOWN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cooldownDays === 7 && (
                    <span className="text-[11px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                      추천
                    </span>
                  )}
                </div>
              </div>

              {/* 고급 설정 아코디언 */}
              <CollapsibleSection title="고급 설정">
                <DriftAlertSettings
                  prefs={prefs ?? null}
                  isLoading={isLoading}
                  updateMutation={updateMutation}
                  isPlusOrAbove={isPlusOrAbove}
                />
              </CollapsibleSection>
            </div>
          )}
        </div>

        {/* ── 정기 리포트 카드 ── */}
        <div
          className={cn(
            "rounded-xl border bg-card p-4 transition-colors duration-300",
            reportOn ? "border-purple-500/25" : "border-border/50",
          )}
        >
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                  reportOn
                    ? "bg-purple-500/10 text-purple-500"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <FileText className="size-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">정기 리포트</span>
                {!isPlusOrAbove && (
                  <span className="text-[11px] font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Lock className="size-3" /> Plus
                  </span>
                )}
              </div>
            </div>
            <Switch
              checked={reportOn}
              disabled={!isPlusOrAbove || isLoading || updateMutation.isPending}
              onCheckedChange={(v) =>
                handleToggle("monthly_report_enabled", v)
              }
            />
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            포트폴리오 현황을 정기적으로 요약해서 보내드려요
          </p>

          {reportOn && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <ReportScheduleSettings
                prefs={prefs ?? null}
                isLoading={isLoading}
                updateMutation={updateMutation}
                isPlusOrAbove={isPlusOrAbove}
              />

              <CollapsibleSection title="리포트 포함 내용">
                <ReportContentSettings
                  prefs={prefs ?? null}
                  isLoading={isLoading}
                  updateMutation={updateMutation}
                  isPlusOrAbove={isPlusOrAbove}
                />
              </CollapsibleSection>
            </div>
          )}
        </div>

        {/* ── 주간 종목 뉴스 카드 ── */}
        <div
          className={cn(
            "rounded-xl border bg-card p-4 transition-colors duration-300",
            newsOn ? "border-orange-500/25" : "border-border/50",
          )}
        >
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                  newsOn
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Newspaper className="size-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">주간 종목 뉴스</span>
                {!isPlusOrAbove && (
                  <span className="text-[11px] font-semibold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Lock className="size-3" /> Plus
                  </span>
                )}
              </div>
            </div>
            <Switch
              checked={newsOn}
              disabled={!isPlusOrAbove || isLoading || updateMutation.isPending}
              onCheckedChange={(v) => handleToggle("weekly_news_enabled", v)}
            />
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            관심 종목의 주간 뉴스 요약 브리핑을 보내드려요
          </p>
        </div>

        {/* ── 테스트 및 기록 ── */}
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden md:col-span-1">
          {/* 테스트 이메일 발송 (Admin only) */}
          {isAdmin && (
            <>
              <button
                onClick={() => setShowTestPanel(!showTestPanel)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <Send className="size-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">테스트 이메일 발송</span>
                    <span className="text-[10px] font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-300",
                    showTestPanel && "rotate-180",
                  )}
                />
              </button>

              {showTestPanel && (
                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">알림 유형</Label>
                    <Select
                      value={testType}
                      onValueChange={(v) => setTestType(v as typeof testType)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">기본 테스트</SelectItem>
                        <SelectItem value="drift">
                          비중 변동 알림 (예시)
                        </SelectItem>
                        <SelectItem value="monthly">
                          정기 리포트 (예시)
                        </SelectItem>
                        <SelectItem value="weekly-news">
                          주간 종목 뉴스 (예시)
                        </SelectItem>
                        <SelectItem value="drift-real">
                          비중 변동 알림 (내 포트폴리오)
                        </SelectItem>
                        <SelectItem value="monthly-real">
                          정기 리포트 (내 포트폴리오)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTest(testType)}
                    disabled={isSendingTest}
                    className="gap-2 w-full"
                  >
                    {isSendingTest && <Loader2 className="size-4 animate-spin" />}
                    테스트 이메일 보내기
                  </Button>
                </div>
              )}
            </>
          )}

          {/* 발송 기록 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 text-left border-t border-border/50 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Clock className="size-3.5" />
              </div>
              <span className="text-sm font-semibold">
                발송 기록
                {PLAN_LIMITS[plan].maxNotificationHistory !== Infinity && (
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (최대 {PLAN_LIMITS[plan].maxNotificationHistory}건)
                  </span>
                )}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-300",
                showHistory && "rotate-180",
              )}
            />
          </button>

          {showHistory && (
            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <NotificationHistory limit={historyLimit} />
            </div>
          )}
        </div>

        {/* ── 현재 설정 요약 ── */}
        <div className="md:col-span-2 rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            현재 설정 요약
          </div>
          <div className="space-y-1.5">
            <SummaryRow
              label="비중 변동 알림"
              value={
                deviationOn ? `ON · ${cooldownDays}일 간격` : "OFF"
              }
              active={deviationOn}
            />
            {deviationOn && (
              <SummaryRow
                label="  └ 알림 기준"
                value={
                  prefs?.alert_severity === "major_only"
                    ? `${threshold * 2}% (x2 적용)`
                    : `${threshold}%`
                }
                active
                sub
              />
            )}
            <SummaryRow
              label="정기 리포트"
              value={reportOn ? `ON · ${intervalLabel}` : "OFF"}
              active={reportOn}
            />
            <SummaryRow
              label="주간 종목 뉴스"
              value={newsOn ? "ON" : "OFF"}
              active={newsOn}
            />
          </div>
        </div>

        </div>{/* grid 닫기 */}
      </div>
    </PageTransition>
  );
}
