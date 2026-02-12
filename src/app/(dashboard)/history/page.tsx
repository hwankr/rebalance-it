"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useHistory } from "@/hooks/use-history";
import { formatCurrency } from "@/lib/utils/format";
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

const STATUS_MAP: Record<
  "completed" | "partial" | "failed",
  { label: string; className: string }
> = {
  completed: {
    label: "완료",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  partial: {
    label: "부분",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  failed: {
    label: "실패",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

export default function HistoryPage() {
  const { history, deleteExecution, clearHistory } = useHistory();
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleClear = () => {
    clearHistory();
    setClearOpen(false);
    toast.success("전체 이력이 삭제되었습니다.");
  };

  const handleDelete = (id: string) => {
    deleteExecution(id);
    setDeleteTarget(null);
    toast.success("이력이 삭제되었습니다.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">실행 이력</h1>
          <p className="text-muted-foreground">
            리밸런싱 실행 이력을 확인합니다.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="destructive" onClick={() => setClearOpen(true)}>
            전체 삭제
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 p-12">
          <p className="text-muted-foreground text-lg">
            아직 실행 이력이 없습니다.
          </p>
          <Button asChild>
            <Link href="/rebalance/simulate">시뮬레이션 시작하기</Link>
          </Button>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>실행일시</TableHead>
                <TableHead>프로필명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">주문건수</TableHead>
                <TableHead className="text-right">성공/실패</TableHead>
                <TableHead className="text-right">총매수</TableHead>
                <TableHead className="text-right">총매도</TableHead>
                <TableHead className="text-right">순현금</TableHead>
                <TableHead className="text-center">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((exec) => {
                const statusInfo = STATUS_MAP[exec.status];
                return (
                  <TableRow key={exec.id}>
                    <TableCell>
                      {format(new Date(exec.executed_at), "yyyy.MM.dd HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {exec.profile_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.className}>
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
                        onClick={() => setDeleteTarget(exec.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <p className="text-muted-foreground text-sm">
            총 {history.length}건
          </p>
        </>
      )}

      {/* 전체 삭제 확인 Dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전체 이력 삭제</DialogTitle>
            <DialogDescription>
              모든 실행 이력을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
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
            <DialogTitle>이력 삭제</DialogTitle>
            <DialogDescription>
              이 실행 이력을 삭제하시겠습니까?
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
  );
}
