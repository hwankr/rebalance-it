"use client";

import type { RebalanceOrder } from "@/lib/rebalance/types";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderPreviewProps {
  orders: RebalanceOrder[];
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashChange: number;
  isLoading?: boolean;
}

export function OrderPreview({
  orders,
  totalBuyAmount,
  totalSellAmount,
  netCashChange,
  isLoading,
}: OrderPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        주문 데이터를 불러오는 중...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        리밸런싱 주문이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목명</TableHead>
            <TableHead>매매구분</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">예상가격</TableHead>
            <TableHead className="text-right">예상금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={`${order.stock_code}-${order.side}`}>
              <TableCell className="font-medium">
                {order.stock_name}
              </TableCell>
              <TableCell>
                {order.side === "buy" ? (
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
                {order.quantity.toLocaleString("ko-KR")}주
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.estimated_price)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.estimated_amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="text-muted-foreground">총 매수 금액</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totalBuyAmount)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">총 매도 금액</p>
          <p className="text-lg font-semibold text-red-600">
            {formatCurrency(totalSellAmount)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">순 현금 변동</p>
          <p
            className={`text-lg font-semibold ${
              netCashChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {netCashChange >= 0 ? "+" : ""}
            {formatCurrency(netCashChange)}
          </p>
        </div>
      </div>
    </div>
  );
}
