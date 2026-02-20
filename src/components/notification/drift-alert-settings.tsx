"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NotificationPreferences } from "@/hooks/use-notification-preferences";
import type { UseMutationResult } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/use-accounts";

interface DriftAlertSettingsProps {
  prefs: NotificationPreferences | null;
  isLoading: boolean;
  updateMutation: UseMutationResult<void, Error, Partial<Omit<NotificationPreferences, "user_id">>>;
  isPlusOrAbove: boolean;
}

export function DriftAlertSettings({
  prefs,
  isLoading,
  updateMutation,
  isPlusOrAbove,
}: DriftAlertSettingsProps) {
  const { accounts } = useAccounts();
  const excludedIds: string[] = prefs?.excluded_portfolio_ids ?? [];
  const hasCustomThreshold = prefs?.alert_threshold_pct != null;

  function handleUpdate(updates: Partial<Omit<NotificationPreferences, "user_id">>) {
    updateMutation.mutate(updates, {
      onSuccess: () => toast.success("설정이 저장되었습니다."),
      onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
    });
  }

  function handleThresholdToggle(enabled: boolean) {
    handleUpdate({
      alert_threshold_pct: enabled ? 5 : null,
    });
  }

  function handleThresholdChange(value: string) {
    const num = Number(value);
    if (!isNaN(num) && num > 0 && num <= 100) {
      handleUpdate({ alert_threshold_pct: num });
    }
  }

  function handleSeverityChange(value: string) {
    handleUpdate({ alert_severity: value as "all" | "major_only" });
  }

  function handleModeChange(value: string) {
    handleUpdate({ alert_mode: value as "individual" | "digest" });
  }

  function handlePortfolioToggle(portfolioId: string, enabled: boolean) {
    const newExcluded = enabled
      ? excludedIds.filter((id) => id !== portfolioId)
      : [...excludedIds, portfolioId];
    handleUpdate({ excluded_portfolio_ids: newExcluded });
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>드리프트 알림 상세 설정</CardTitle>
        <CardDescription>알림 조건과 모드를 세부적으로 설정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 알림 전용 임계값 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">알림 전용 임계값</Label>
              <p className="text-xs text-muted-foreground">
                리밸런싱 임계값과 별도로 알림 임계값을 설정합니다
              </p>
            </div>
            <Switch
              checked={hasCustomThreshold}
              disabled={isLoading || updateMutation.isPending}
              onCheckedChange={handleThresholdToggle}
            />
          </div>
          {hasCustomThreshold && (
            <div className="flex items-center gap-2 pl-1">
              <Input
                type="number"
                min={1}
                max={100}
                step={0.5}
                className="w-24"
                defaultValue={prefs?.alert_threshold_pct ?? 5}
                disabled={isLoading || updateMutation.isPending}
                onBlur={(e) => handleThresholdChange(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">% 초과 시 알림</span>
            </div>
          )}
        </div>

        {/* 알림 심각도 */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">알림 심각도</Label>
          <Select
            value={prefs?.alert_severity ?? "all"}
            disabled={isLoading || updateMutation.isPending}
            onValueChange={handleSeverityChange}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 편차 알림</SelectItem>
              <SelectItem value="major_only">큰 편차만 알림 (임계값 x2)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {prefs?.alert_severity === "major_only"
              ? "임계값의 2배 이상 벗어난 경우에만 알림합니다"
              : "임계값을 초과하면 즉시 알림합니다"}
          </p>
        </div>

        {/* 알림 모드 */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            알림 모드
            {!isPlusOrAbove && (
              <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                <Lock className="size-3" />
                다이제스트는 Plus 플랜 필요
              </span>
            )}
          </Label>
          <Select
            value={prefs?.alert_mode ?? "individual"}
            disabled={isLoading || updateMutation.isPending}
            onValueChange={handleModeChange}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">즉시 알림</SelectItem>
              <SelectItem value="digest" disabled={!isPlusOrAbove}>
                요약 알림 (다이제스트)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {prefs?.alert_mode === "digest"
              ? "쿨다운 기간 동안 누적된 드리프트를 한 번에 요약 발송합니다"
              : "드리프트 감지 즉시 개별 알림을 발송합니다"}
          </p>
        </div>

        {/* 포트폴리오별 알림 */}
        {accounts.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">포트폴리오별 알림</Label>
            <p className="text-xs text-muted-foreground mb-2">
              특정 포트폴리오를 알림에서 제외할 수 있습니다
            </p>
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-4 py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">{account.name}</span>
                  <Switch
                    checked={!excludedIds.includes(account.id)}
                    disabled={isLoading || updateMutation.isPending}
                    onCheckedChange={(checked) =>
                      handlePortfolioToggle(account.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
