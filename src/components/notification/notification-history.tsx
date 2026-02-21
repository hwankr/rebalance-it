"use client";

import { Badge } from "@/components/ui/badge";
import { useNotificationLog, type NotificationStatus, type NotificationType } from "@/hooks/use-notification-log";

interface NotificationHistoryProps {
  limit?: number;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}개월 전`;
  return `${Math.floor(diffMo / 12)}년 전`;
}

const STATUS_CONFIG: Record<NotificationStatus, { label: string; className: string }> = {
  sent: { label: "발송됨", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  failed: { label: "실패", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  pending: { label: "대기중", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  retrying: { label: "재시도중", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
};

const TYPE_CONFIG: Record<NotificationType, { label: string; className: string }> = {
  drift_alert: { label: "비중 변동 알림", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  monthly_report: { label: "월간 리포트", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  test: { label: "테스트", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
};

export function NotificationHistory({ limit = 10 }: NotificationHistoryProps) {
  const { data, isLoading } = useNotificationLog(limit);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        아직 발송된 알림이 없습니다
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((entry) => {
        const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
        const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.test;
        const timeStr = entry.sent_at ?? entry.created_at;

        return (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-3"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={typeCfg.className} variant="outline">
                  {typeCfg.label}
                </Badge>
                <span className="text-sm font-medium truncate">{entry.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{getRelativeTime(timeStr)}</span>
              {entry.error_message && entry.status === "failed" && (
                <span className="text-xs text-red-500 truncate">{entry.error_message}</span>
              )}
            </div>
            <Badge className={statusCfg.className} variant="outline">
              {statusCfg.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
