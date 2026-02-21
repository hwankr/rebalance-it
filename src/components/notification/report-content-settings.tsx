"use client";

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences, ReportSections } from "@/hooks/use-notification-preferences";
import type { UseMutationResult } from "@tanstack/react-query";

const SECTION_OPTIONS: { key: keyof ReportSections; label: string }[] = [
  { key: "summary", label: "총자산 요약" },
  { key: "portfolios", label: "계좌별 현황" },
  { key: "drift_table", label: "비중 편차 상세" },
  { key: "activity", label: "리밸런싱 활동" },
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

  return (
    <div className="space-y-2">
      {SECTION_OPTIONS.map((option) => (
        <div
          key={option.key}
          className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
        >
          <span className="text-xs text-muted-foreground">{option.label}</span>
          <Switch
            checked={sections[option.key]}
            disabled={isDisabled}
            onCheckedChange={(checked) =>
              handleSectionToggle(option.key, checked)
            }
          />
        </div>
      ))}
    </div>
  );
}
