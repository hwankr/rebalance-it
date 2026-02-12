"use client";

import { m } from "framer-motion";
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
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {orders.map((order, i) => (
          <m.div
            key={`${order.stock_code}-${order.side}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <div className="glass-card card-hover rounded-xl p-4">
              {/* Top row: stock name + side badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="font-semibold">{order.stock_name}</div>
                {order.side === "buy" ? (
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 shrink-0">
                    매수
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 shrink-0">
                    매도
                  </Badge>
                )}
              </div>

              {/* Bottom row: quantity x price = amount */}
              <div className="text-sm text-muted-foreground tabular-nums">
                {order.quantity.toLocaleString("ko-KR")}주 × {formatCurrency(order.estimated_price)} =
                <span className="font-medium text-foreground ml-1">
                  {formatCurrency(order.estimated_amount)}
                </span>
              </div>
            </div>
          </m.div>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 text-sm">
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
