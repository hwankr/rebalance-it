"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useExecutionData } from "@/hooks/use-execution-data";
import { useHistory } from "@/hooks/use-history";
import { useRebalanceExecution } from "@/hooks/use-rebalance";
import { OrderPreview } from "@/components/rebalance/order-preview";
import { ExecutionStatus } from "@/components/rebalance/execution-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Phase = "confirm" | "executing" | "completed";

interface ExecutionResultItem {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  success: boolean;
  error?: string;
}

interface ExecutionResults {
  total: number;
  success_count: number;
  fail_count: number;
  results: ExecutionResultItem[];
}

export default function ExecutePage() {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [executionResults, setExecutionResults] =
    useState<ExecutionResults | null>(null);
  const historySavedRef = useRef(false);

  const executionData = useExecutionData();
  const { addExecution } = useHistory();
  const executeMutation = useRebalanceExecution();

  const handleExecute = () => {
    if (!executionData.data) return;

    setPhase("executing");

    executeMutation.mutate(
      {
        orders: executionData.data.orders,
        account: executionData.data.account,
      },
      {
        onSuccess: (data) => {
          setExecutionResults(data);
          setPhase("completed");

          // Save to history (once)
          if (!historySavedRef.current && executionData.data) {
            historySavedRef.current = true;
            const d = executionData.data;
            addExecution({
              profile_id: d.profile_id ?? "",
              profile_name: d.profile_name,
              status:
                data.fail_count === 0
                  ? "completed"
                  : data.success_count === 0
                    ? "failed"
                    : "partial",
              total_orders: data.total,
              success_count: data.success_count,
              fail_count: data.fail_count,
              total_buy_amount: d.total_buy_amount ?? 0,
              total_sell_amount: d.total_sell_amount ?? 0,
              net_cash_change: d.net_cash_change ?? 0,
              orders: data.results.map((r) => {
                const orig = d.orders.find(
                  (o) => o.stock_code === r.stock_code && o.side === r.side
                );
                return {
                  stock_code: r.stock_code,
                  stock_name: r.stock_name,
                  side: r.side,
                  quantity: r.quantity,
                  estimated_price: orig?.estimated_price ?? 0,
                  estimated_amount: orig?.estimated_amount ?? 0,
                  success: r.success,
                  error: r.error,
                };
              }),
            });
          }

          executionData.clear();
        },
        onError: () => {
          toast.error("주문 실행에 실패했습니다.");
          setPhase("confirm");
        },
      }
    );
  };

  // Phase: Executing
  if (phase === "executing") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">리밸런싱 실행</h1>
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">
            주문을 실행 중입니다... 잠시만 기다려주세요.
          </p>
        </div>
      </div>
    );
  }

  // Phase: Completed
  if (phase === "completed" && executionResults) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">실행 완료</h1>

        <ExecutionStatus
          results={executionResults.results}
          totalCount={executionResults.total}
          successCount={executionResults.success_count}
          failCount={executionResults.fail_count}
        />

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/portfolio">포트폴리오 확인</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/history">이력 확인</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Phase: Confirm
  if (!executionData.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">리밸런싱 실행</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-muted-foreground">
              시뮬레이션 결과가 없습니다. 먼저 시뮬레이션을 실행해주세요.
            </p>
            <Button asChild variant="outline">
              <Link href="/rebalance/simulate">시뮬레이션으로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { orders, profile_name } = executionData.data;
  const totalBuyAmount = orders
    .filter((o) => o.side === "buy")
    .reduce((sum, o) => sum + o.estimated_amount, 0);
  const totalSellAmount = orders
    .filter((o) => o.side === "sell")
    .reduce((sum, o) => sum + o.estimated_amount, 0);
  const netCashChange = totalSellAmount - totalBuyAmount;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">리밸런싱 실행</h1>
      <p className="text-muted-foreground">리밸런싱 주문을 실행합니다.</p>

      {/* Warning */}
      <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="size-5 shrink-0" />
        <p className="text-sm font-medium">
          아래 주문이 실제로 실행됩니다. 신중하게 확인해주세요.
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>프로필: {profile_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderPreview
            orders={orders}
            totalBuyAmount={totalBuyAmount}
            totalSellAmount={totalSellAmount}
            netCashChange={netCashChange}
          />
        </CardContent>
      </Card>

      {/* Execute Button with Confirmation Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" size="lg">
            주문 실행
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정말 실행하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 주문이 실제 계좌에서 실행됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleExecute}>
                확인
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
