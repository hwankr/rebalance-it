"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExecutionResultItem {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  success: boolean;
  error?: string;
}

interface ExecutionStatusProps {
  results: ExecutionResultItem[];
  totalCount: number;
  successCount: number;
  failCount: number;
}

export function ExecutionStatus({
  results,
  totalCount,
  successCount,
  failCount,
}: ExecutionStatusProps) {
  const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
  const failRate = totalCount > 0 ? (failCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>실행 결과 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{totalCount}건</span> 중
            성공 <span className="font-semibold text-green-600">{successCount}건</span>,
            실패 <span className="font-semibold text-red-600">{failCount}건</span>
          </p>

          {/* Progress Bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {successRate > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${successRate}%` }}
              />
            )}
            {failRate > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${failRate}%` }}
              />
            )}
          </div>

          {/* Status Message */}
          {failCount === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle className="size-5" />
              <span className="text-sm font-medium">모든 주문이 성공적으로 실행되었습니다.</span>
            </div>
          )}
          {failCount > 0 && successCount > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
              <AlertTriangle className="size-5" />
              <span className="text-sm font-medium">일부 주문이 실패했습니다.</span>
            </div>
          )}
          {successCount === 0 && totalCount > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <XCircle className="size-5" />
              <span className="text-sm font-medium">모든 주문이 실패했습니다.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>주문별 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>종목명</TableHead>
                <TableHead>매매구분</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-center">결과</TableHead>
                <TableHead>에러</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={`${result.stock_code}-${result.side}`}>
                  <TableCell className="font-medium">
                    {result.stock_name}
                  </TableCell>
                  <TableCell>
                    {result.side === "buy" ? (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        매수
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
                        매도
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.quantity.toLocaleString("ko-KR")}주
                  </TableCell>
                  <TableCell className="text-center">
                    {result.success ? (
                      <CheckCircle className="mx-auto size-5 text-green-600" />
                    ) : (
                      <XCircle className="mx-auto size-5 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {result.error ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
