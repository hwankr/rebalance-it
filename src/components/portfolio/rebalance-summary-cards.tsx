import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RebalanceSummaryCardsProps {
  stocks: Array<{
    id: string;
    target_pct: number;
    is_rebalance_tracked?: boolean;
  }>;
  accountId?: string | null;
}

export function RebalanceSummaryCards({ stocks, accountId }: RebalanceSummaryCardsProps) {
  const trackedStocks = stocks.filter(s => s.is_rebalance_tracked !== false);
  const trackedCount = trackedStocks.length;
  const totalCount = stocks.length;
  const excludedCount = totalCount - trackedCount;
  const rawTotalTargetPct = trackedStocks.reduce((sum, s) => sum + (s.target_pct ?? 0), 0);
  const totalTargetPct = Math.round(rawTotalTargetPct);
  const isOverAllocated = rawTotalTargetPct > 100;
  const cashTargetPct = Math.max(0, 100 - totalTargetPct);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1 - 리밸런싱 대상 */}
      <div className="bg-card rounded-xl p-5 shadow-sm border">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          리밸런싱 대상
        </h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-primary">{trackedCount}</span>
          <span className="text-sm text-muted-foreground mb-1.5">
            / {totalCount} 종목
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          <Badge variant="outline">{excludedCount}개 종목 제외됨</Badge>
        </div>
      </div>

      {/* Card 2 - 종목 비중 합계 */}
      <div className="bg-card rounded-xl p-5 shadow-sm border">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          종목 비중 합계
        </h3>
        <div className="flex items-end gap-2">
          <span
            className={cn(
              "text-3xl font-bold",
              isOverAllocated ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}
          >
            {totalTargetPct}%
          </span>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          {isOverAllocated
            ? "종목 비중 합계가 100%를 초과했습니다. 조정해주세요."
            : `현금 비중: ${cashTargetPct}% (자동)`}
        </div>
      </div>

      {/* Card 3 - CTA */}
      <div className="flex items-center justify-center">
        <Link
          href={accountId ? `/rebalance?account=${accountId}` : "/rebalance"}
          className="w-full h-full min-h-[120px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-colors flex flex-col items-center justify-center gap-2"
        >
          <RefreshCw className="size-6" />
          <span className="font-semibold">리밸런싱 실행하기</span>
        </Link>
      </div>
    </div>
  );
}
