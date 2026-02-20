"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NotificationPreferences, ReportSections } from "@/hooks/use-notification-preferences";
import type { UseMutationResult } from "@tanstack/react-query";

const SECTION_OPTIONS: { key: keyof ReportSections; label: string; description: string }[] = [
  { key: "summary", label: "총자산 요약", description: "총자산, 전월 대비 변동" },
  { key: "portfolios", label: "계좌별 현황", description: "각 포트폴리오의 평가금액, 종목 수, 드리프트" },
  { key: "drift_table", label: "드리프트 상세", description: "임계치 초과 종목 테이블" },
  { key: "activity", label: "리밸런싱 활동", description: "이번 기간 실행 횟수, 완료 세션" },
];

interface ReportContentSettingsProps {
  prefs: NotificationPreferences | null;
  isLoading: boolean;
  updateMutation: UseMutationResult<void, Error, Partial<Omit<NotificationPreferences, "user_id">>>;
  isPlusOrAbove: boolean;
}

export function ReportContentSettings({
  prefs,
  isLoading,
  updateMutation,
  isPlusOrAbove,
}: ReportContentSettingsProps) {
  const sections: ReportSections = prefs?.report_sections ?? {
    summary: true,
    portfolios: true,
    drift_table: true,
    activity: true,
  };

  const isDisabled = !isPlusOrAbove || isLoading || updateMutation.isPending;

  function handleSectionToggle(key: keyof ReportSections, enabled: boolean) {
    const newSections = { ...sections, [key]: enabled };

    // 최소 1개 섹션은 활성화 상태여야 함
    const activeCount = Object.values(newSections).filter(Boolean).length;
    if (activeCount === 0) {
      toast.error("최소 1개 섹션은 활성화해야 합니다.");
      return;
    }

    updateMutation.mutate(
      { report_sections: newSections },
      {
        onSuccess: () => toast.success("리포트 내용 설정이 저장되었습니다."),
        onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
      },
    );
  }

  if (!prefs?.monthly_report_enabled) return null;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>리포트 내용 설정</CardTitle>
        <CardDescription>리포트에 포함할 섹션을 선택합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SECTION_OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between gap-4 py-1.5"
          >
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{option.label}</Label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              checked={sections[option.key]}
              disabled={isDisabled}
              onCheckedChange={(checked) =>
                handleSectionToggle(option.key, checked)
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
