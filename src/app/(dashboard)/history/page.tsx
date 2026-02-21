"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { m } from "framer-motion";

import { useHistory } from "@/hooks/use-history";
import { useSubscription } from "@/hooks/use-subscription";
import { useAccounts } from "@/hooks/use-accounts";
import { useHistoryFilters } from "@/hooks/use-history-filters";

import { computeHistoryStats } from "@/lib/rebalance/history-stats";
import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { DEFAULT_HISTORY_FILTERS } from "@/components/history/history-filter-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/layout/page-transition";
import { HistoryDetailSheet } from "@/components/history/history-detail-sheet";
import { HistorySummaryCards } from "@/components/history/history-summary-cards";
import { HistoryFilterBar } from "@/components/history/history-filter-bar";
import { HistoryRow } from "@/components/history/history-row";
import { AccountTabs } from "@/components/account/account-tabs";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";

export default function HistoryPage() {
  const router = useRouter();
  const { selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const { history, deleteExecution, clearHistory } = useHistory(portfolioId);
  const { isPlusOrAbove } = useSubscription();
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [detailExec, setDetailExec] = useState<RebalanceExecution | null>(null);

  // Compute stats from FULL unfiltered history
  const stats = useMemo(() => computeHistoryStats(history), [history]);

  // Client-side filtering (resetKey resets filters on account change)
  const { filters, setFilters, filteredHistory, isFiltered } =
    useHistoryFilters(history, portfolioId);

  // Subscription gating applied AFTER filtering
  const maxVisible = isPlusOrAbove ? Infinity : PLAN_LIMITS.free.maxSimulationHistory;
  const visibleHistory = filteredHistory.slice(0, maxVisible);
  const hasHidden = filteredHistory.length > maxVisible;

  const handleClear = () => {
    clearHistory();
    setClearOpen(false);
    toast.success("전체 기록이 삭제되었습니다.");
  };

  const handleDelete = (id: string) => {
    deleteExecution(id);
    setDeleteTarget(null);
    toast.success("기록이 삭제되었습니다.");
  };

  const handleSelect = (exec: RebalanceExecution) => {
    if (exec.status === "in_progress") {
      router.push("/rebalance");
    } else {
      setDetailExec(exec);
    }
  };

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">리밸런싱 기록</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            리밸런싱 시뮬레이션 기록을 확인합니다.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="destructive" onClick={() => setClearOpen(true)}>
            전체 삭제
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {history.length > 0 && <HistorySummaryCards stats={stats} />}

      {/* Account Tabs */}
      <AccountTabs />

      {/* Filter Bar (key resets filters on account change) */}
      {history.length > 0 && (
        <HistoryFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          filteredCount={filteredHistory.length}
          totalCount={history.length}
        />
      )}

      {history.length === 0 ? (
        /* True empty: no history records at all */
        <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground text-lg">
            아직 리밸런싱 기록이 없습니다.
          </p>
          <Button asChild>
            <Link href="/rebalance/simulate">시뮬레이션 시작하기</Link>
          </Button>
        </div>
      ) : filteredHistory.length === 0 ? (
        /* Filter-empty: has history but filters exclude everything */
        <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground text-lg">
            조건에 맞는 기록이 없습니다.
          </p>
          <Button
            variant="outline"
            onClick={() => setFilters(DEFAULT_HISTORY_FILTERS)}
          >
            필터 초기화
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop header row */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-2">실행일시 / 상태</div>
            <div className="col-span-2">거래건수 (성공/실패)</div>
            <div className="col-span-2 text-right">총 매수</div>
            <div className="col-span-2 text-right">총 매도</div>
            <div className="col-span-3 text-right">순현금 (P/L)</div>
            <div className="col-span-1 text-center">관리</div>
          </div>

          {/* History rows */}
          <div className="space-y-4">
            {visibleHistory.map((exec, i) => (
              <m.div
                key={exec.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <HistoryRow
                  execution={exec}
                  onSelect={handleSelect}
                  onDelete={(id) => setDeleteTarget(id)}
                />
              </m.div>
            ))}
          </div>

          {/* Footer count */}
          <div className="text-center text-sm text-muted-foreground">
            {isFiltered
              ? `총 ${filteredHistory.length}건 (전체 ${history.length}건)`
              : `총 ${history.length}건`}
            {hasHidden && ` (최근 ${maxVisible}건만 표시)`}
          </div>

          {hasHidden && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Pro 플랜으로 업그레이드하면 전체 이력을 볼 수 있습니다.{" "}
                <Link href="/pricing" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
                  요금제 보기
                </Link>
              </p>
            </Card>
          )}
        </>
      )}

      {/* History detail sheet */}
      <HistoryDetailSheet
        execution={detailExec}
        open={detailExec !== null}
        onOpenChange={(open) => !open && setDetailExec(null)}
      />

      {/* 전체 삭제 확인 Dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전체 기록 삭제</DialogTitle>
            <DialogDescription>
              모든 리밸런싱 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleClear}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 개별 삭제 확인 Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기록 삭제</DialogTitle>
            <DialogDescription>
              이 리밸런싱 기록을 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
