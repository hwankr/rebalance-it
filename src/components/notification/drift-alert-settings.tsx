"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  function handleUpdate(updates: Partial<Omit<NotificationPreferences, "user_id">>) {
    updateMutation.mutate(updates, {
      onSuccess: () => toast.success("설정이 저장되었습니다."),
      onError: (err) => toast.error(`저장 오류: ${err.message}`),
    });
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
    <div className="space-y-3">
      {/* 알림 방식 */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
        <div>
          <div className="text-sm font-semibold">알림 방식</div>
          {!isPlusOrAbove && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Lock className="size-3" />
              모아서 보내기는 Plus
            </div>
          )}
        </div>
        <Select
          value={prefs?.alert_mode ?? "individual"}
          disabled={isLoading || updateMutation.isPending}
          onValueChange={handleModeChange}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">즉시 알림</SelectItem>
            <SelectItem value="digest" disabled={!isPlusOrAbove}>
              모아서 보내기
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 포트폴리오별 알림 */}
      {accounts.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3">
          <Label className="text-sm font-semibold mb-2.5 block">포트폴리오별 알림</Label>
          <div className="space-y-2.5">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground">{account.name}</span>
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
    </div>
  );
}
