"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";

import { useHistory } from "@/hooks/use-history";
import { useSubscription } from "@/hooks/use-subscription";
import { useAccounts } from "@/hooks/use-accounts";

import { PLAN_LIMITS } from "@/lib/subscription/plans";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
import { AccountTabs } from "@/components/account/account-tabs";
import type { RebalanceExecution } from "@/lib/rebalance/history-types";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "secondary" | "destructive" | "default" | "outline" }
> = {
  completed: {
    label: "완료",
    variant: "success",
  },
  partial: {
    label: "부분 완료",
    variant: "secondary",
  },
  failed: {
    label: "실패",
    variant: "destructive",
  },
  in_progress: {
    label: "진행중",
    variant: "default",
  },
  abandoned: {
    label: "포기",
    variant: "outline",
  },
};

export default function HistoryPage() {
  const router = useRouter();
  const { selectedAccountId } = useAccounts();
  const portfolioId = selectedAccountId === "all" ? null : selectedAccountId;
  const { history, deleteExecution, clearHistory } = useHistory(portfolioId);
  const { isPlusOrAbove } = useSubscription();
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [detailExec, setDetailExec] = useState<RebalanceExecution | null>(null);

  const maxVisible = isPlusOrAbove ? Infinity : PLAN_LIMITS.free.maxSimulationHistory;
  const visibleHistory = history.slice(0, maxVisible);
  const hasHidden = history.length > maxVisible;

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

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">리밸런싱 기록</h1>
          <p className="text-muted-foreground">
            리밸런싱 시뮬레이션 기록을 확인합니다.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="destructive" onClick={() => setClearOpen(true)}>
            전체 삭제
          </Button>
        )}
      </div>

      <AccountTabs />

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground text-lg">
            아직 리밸런싱 기록이 없습니다.
          </p>
          <Button asChild>
            <Link href="/rebalance/simulate">시뮬레이션 시작하기</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table - hidden on mobile */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-foreground/80">실행일시</TableHead>
                  <TableHead className="font-semibold text-foreground/80">리밸런싱명</TableHead>
                  <TableHead className="font-semibold text-foreground/80">상태</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">거래건수</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">성공/실패</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">총매수</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">총매도</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">순현금</TableHead>
                  <TableHead className="text-center font-semibold text-foreground/80">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleHistory.map((exec) => {
                  const statusInfo = STATUS_MAP[exec.status] ?? STATUS_MAP.completed;
                  return (
                    <TableRow
                      key={exec.id}
                      className="hover:bg-accent/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => {
                        if (exec.status === "in_progress") {
                          router.push("/rebalance");
                        } else {
                          setDetailExec(exec);
                        }
                      }}
                    >
                      <TableCell>
                        {format(new Date(exec.executed_at), "yyyy.MM.dd HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {exec.preset_name ?? exec.profile_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.total_orders}
                      </TableCell>
                      <TableCell className="text-right">
                        {exec.success_count}/{exec.fail_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(exec.total_buy_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(exec.total_sell_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          exec.net_cash_change > 0
                            ? "text-green-600 dark:text-green-400"
                            : exec.net_cash_change < 0
                              ? "text-red-600 dark:text-red-400"
                              : ""
                        }`}
                      >
                        {exec.net_cash_change > 0 ? "+" : ""}
                        {formatCurrency(exec.net_cash_change)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(exec.id); }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {visibleHistory.map((exec, i) => {
              const statusInfo = STATUS_MAP[exec.status] ?? STATUS_MAP.completed;
              return (
                <m.div
                  key={exec.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div
                    className={cn(
                      "bg-card rounded-xl p-3 border border-border hover:bg-accent/50 transition-colors cursor-pointer",
                      exec.status === "in_progress" && "ring-1 ring-blue-500/30"
                    )}
                    onClick={() => {
                      if (exec.status === "in_progress") {
                        router.push("/rebalance");
                      } else {
                        setDetailExec(exec);
                      }
                    }}
                  >
                    {/* Top row: profile name + status badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold">{exec.preset_name ?? exec.profile_name}</div>
                      <Badge variant={statusInfo.variant} className="shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Date below in muted text */}
                    <div className="text-xs text-muted-foreground mb-3">
                      {format(new Date(exec.executed_at), "yyyy.MM.dd HH:mm")}
                    </div>

                    {/* Middle: metrics grid */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">거래건수</div>
                        <div className="font-medium tabular-nums text-sm">
                          {exec.total_orders}건
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">성공</div>
                        <div className="font-medium tabular-nums text-sm text-green-600 dark:text-green-400">
                          {exec.success_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">실패</div>
                        <div className="font-medium tabular-nums text-sm text-red-600 dark:text-red-400">
                          {exec.fail_count}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: financial values */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">매수</div>
                        <div className="font-medium tabular-nums text-xs">
                          {formatCurrency(exec.total_buy_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">매도</div>
                        <div className="font-medium tabular-nums text-xs">
                          {formatCurrency(exec.total_sell_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">순현금</div>
                        <div
                          className={cn(
                            "font-medium tabular-nums text-xs",
                            exec.net_cash_change > 0 && "text-green-600 dark:text-green-400",
                            exec.net_cash_change < 0 && "text-red-600 dark:text-red-400"
                          )}
                        >
                          {exec.net_cash_change > 0 ? "+" : ""}
                          {formatCurrency(exec.net_cash_change)}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(exec.id); }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>

          <p className="text-muted-foreground text-sm">
            총 {history.length}건{hasHidden && ` (최근 ${maxVisible}건만 표시)`}
          </p>

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
