"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { m } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { useProgressiveRebalance } from "@/hooks/use-progressive-rebalance";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/layout/page-transition";
import { ProgressSummary } from "@/components/rebalance/progress-summary";
import { ProgressiveOrderList } from "@/components/rebalance/progressive-order-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;
  const {
    activeSession,
    useSession,
    toggleOrder,
    completeSession,
    abandonSession,
    getProgress,
    isCompleting,
    isAbandoning,
  } = useProgressiveRebalance();

  const { data: session, isLoading } = useSession(executionId);

  const [abandonOpen, setAbandonOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  // Redirect active sessions to the integrated rebalance page
  if (activeSession && activeSession.id === executionId) {
    router.replace("/rebalance");
    return null;
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱 진행
          </h1>
          <div className="space-y-3">
            <div className="h-32 skeleton-shimmer rounded-xl bg-muted" />
            <div className="h-48 skeleton-shimmer rounded-xl bg-muted" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!session) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
            리밸런싱 진행
          </h1>
          <Card className="flex flex-col items-center justify-center gap-4 p-12">
            <p className="text-muted-foreground text-lg">
              세션을 찾을 수 없습니다.
            </p>
            <Button asChild>
              <Link href="/rebalance">리밸런싱으로 돌아가기</Link>
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const isInProgress = session.status === "in_progress";
  const isCompleted = session.status === "completed";
  const isAbandoned = session.status === "abandoned";
  const isPartial = session.status === "partial";

  const progress = getProgress(session.orders);
  const sellOrders = session.orders.filter((o) => o.side === "sell");
  const buyOrders = session.orders.filter((o) => o.side === "buy");

  // 세션 시작 후 경과 시간 (30일 이상이면 경고)
  const startedAt = session.started_at ? new Date(session.started_at) : null;
  const daysSinceStart = startedAt
    ? (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const isStale = daysSinceStart > 30;

  async function handleComplete() {
    try {
      await completeSession(executionId);
      setCompleteOpen(false);
      toast.success(
        progress.completed >= progress.total
          ? "리밸런싱이 완료되었습니다!"
          : "리밸런싱이 부분 완료로 저장되었습니다."
      );
      router.push("/history");
    } catch {
      toast.error("완료 처리에 실패했습니다.");
    }
  }

  async function handleAbandon() {
    try {
      await abandonSession(executionId);
      setAbandonOpen(false);
      toast.success("리밸런싱 세션이 포기되었습니다.");
      router.push("/history");
    } catch {
      toast.error("포기 처리에 실패했습니다.");
    }
  }

  function handleToggle(stockCode: string, executed: boolean) {
    toggleOrder(executionId, stockCode, executed);
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
                리밸런싱 진행
              </h1>
              {isInProgress && (
                <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                  <Clock className="size-4" />
                  진행중
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-4" />
                  완료
                </span>
              )}
              {isPartial && (
                <span className="inline-flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                  <CheckCircle2 className="size-4" />
                  부분 완료
                </span>
              )}
              {isAbandoned && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <XCircle className="size-4" />
                  포기
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {isInProgress
                ? "증권사 앱에서 주문을 실행하고, 완료된 주문을 체크하세요."
                : "리밸런싱 기록을 확인합니다."}
            </p>
          </div>
        </div>

        {/* 참고 안내 */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-950/30">
            <AlertTriangle className="size-5 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">참고용 안내입니다</p>
              <p>
                이 가이드는 시뮬레이션 결과를 기반으로 한 참고 자료입니다.
                실제 주문은 증권사 앱(HTS/MTS)에서 직접 실행해주세요.
              </p>
            </div>
          </div>
        </m.div>

        {/* 오래된 세션 경고 */}
        {isStale && isInProgress && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-50 p-4 dark:bg-orange-950/30">
              <Clock className="size-5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">오래된 세션입니다</p>
                <p>
                  이 리밸런싱 세션이 시작된 지{" "}
                  {startedAt &&
                    formatDistanceToNow(startedAt, {
                      locale: ko,
                      addSuffix: false,
                    })}
                  이 경과했습니다. 시장 가격이 크게 변동되었을 수 있으니
                  새 시뮬레이션을 권장합니다.
                </p>
              </div>
            </div>
          </m.div>
        )}

        {/* Progress summary */}
        <ProgressSummary
          orders={session.orders}
          totalBuyAmount={session.total_buy_amount}
          totalSellAmount={session.total_sell_amount}
        />

        {/* 매도 주문 */}
        {sellOrders.length > 0 && (
          <ProgressiveOrderList
            orders={session.orders}
            side="sell"
            stepNumber={1}
            onToggle={handleToggle}
            disabled={!isInProgress}
          />
        )}

        {/* 매수 주문 */}
        {buyOrders.length > 0 && (
          <ProgressiveOrderList
            orders={session.orders}
            side="buy"
            stepNumber={sellOrders.length > 0 ? 2 : 1}
            onToggle={handleToggle}
            disabled={!isInProgress}
          />
        )}

        {/* 순 현금 변동 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">순 현금 변동</span>
              <span
                className={`text-xl font-bold ${
                  session.net_cash_change >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {session.net_cash_change >= 0 ? "+" : ""}
                {formatCurrency(session.net_cash_change)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 액션 버튼 */}
        {isInProgress && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setCompleteOpen(true)}
              className="gap-2"
            >
              <CheckCircle2 className="size-4" />
              리밸런싱 완료
            </Button>
            <Button
              variant="outline"
              onClick={() => setAbandonOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <XCircle className="size-4" />
              포기
            </Button>
            <Button variant="outline" asChild>
              <Link href="/rebalance">새 시뮬레이션</Link>
            </Button>
          </div>
        )}

        {!isInProgress && (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/rebalance">새 리밸런싱</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/history">기록 보기</Link>
            </Button>
          </div>
        )}
      </div>

      {/* 완료 확인 Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리밸런싱 완료</DialogTitle>
            <DialogDescription>
              {progress.completed >= progress.total
                ? "모든 주문이 완료되었습니다. 리밸런싱을 완료하시겠습니까?"
                : `${progress.total}건 중 ${progress.completed}건만 완료되었습니다. 부분 완료로 저장됩니다. 계속하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "처리 중..." : "완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 포기 확인 Dialog */}
      <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리밸런싱 포기</DialogTitle>
            <DialogDescription>
              이 리밸런싱 세션을 포기하시겠습니까? 진행 상태는 기록에 보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={isAbandoning}
            >
              {isAbandoning ? "처리 중..." : "포기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
