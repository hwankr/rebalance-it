"use client";

import { AlertTriangle, BookmarkPlus, Play } from "lucide-react";
import { m } from "framer-motion";
import type { RebalanceOrder } from "@/lib/rebalance/types";
import { formatCurrency } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface TradeGuideSectionProps {
  orders: RebalanceOrder[];
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashChange: number;
  onSaveToHistory?: () => void;
  isSaved?: boolean;
  onStartProgressive?: () => void;
  isStartingProgressive?: boolean;
  hasActiveSession?: boolean;
}

export function TradeGuideSection({
  orders,
  totalBuyAmount,
  totalSellAmount,
  netCashChange,
  onSaveToHistory,
  isSaved = false,
  onStartProgressive,
  isStartingProgressive = false,
  hasActiveSession = false,
}: TradeGuideSectionProps) {
  const sellOrders = orders.filter((o) => o.side === "sell");
  const buyOrders = orders.filter((o) => o.side === "buy");

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
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
              시장 상황에 따라 실제 체결 가격은 달라질 수 있습니다.
            </p>
          </div>
        </div>
      </m.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>매도 종목</CardDescription>
            <CardTitle className="text-2xl">{sellOrders.length}건</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>매수 종목</CardDescription>
            <CardTitle className="text-2xl">{buyOrders.length}건</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 매도 금액</CardDescription>
            <CardTitle className="text-xl text-red-600 dark:text-red-400">
              {formatCurrency(totalSellAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 매수 금액</CardDescription>
            <CardTitle className="text-xl text-green-600 dark:text-green-400">
              {formatCurrency(totalBuyAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Step 1: Sell Orders */}
      {sellOrders.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
                  1단계
                </Badge>
                <CardTitle>매도할 종목</CardTitle>
              </div>
              <CardDescription>
                현금을 확보하기 위해 아래 종목을 먼저 매도하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>종목명</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">예상 가격</TableHead>
                      <TableHead className="text-right">예상 금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellOrders.map((order) => (
                      <TableRow key={order.stock_code}>
                        <TableCell className="font-medium">
                          {order.stock_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {order.quantity.toLocaleString("ko-KR")}주
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(order.estimated_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(order.estimated_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {sellOrders.map((order, i) => (
                  <m.div
                    key={order.stock_code}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                  >
                    <div className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{order.stock_name}</span>
                        <Badge className="bg-red-500/10 text-red-600">매도</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                        {formatCurrency(order.estimated_price)} ={" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(order.estimated_amount)}
                        </span>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Step 2: Buy Orders */}
      {buyOrders.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  {sellOrders.length > 0 ? "2단계" : "1단계"}
                </Badge>
                <CardTitle>매수할 종목</CardTitle>
              </div>
              <CardDescription>
                {sellOrders.length > 0
                  ? "매도 완료 후 아래 종목을 매수하세요."
                  : "아래 종목을 매수하세요."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>종목명</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">예상 가격</TableHead>
                      <TableHead className="text-right">예상 금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyOrders.map((order) => (
                      <TableRow key={order.stock_code}>
                        <TableCell className="font-medium">
                          {order.stock_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {order.quantity.toLocaleString("ko-KR")}주
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(order.estimated_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(order.estimated_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {buyOrders.map((order, i) => (
                  <m.div
                    key={order.stock_code}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                  >
                    <div className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{order.stock_name}</span>
                        <Badge className="bg-green-500/10 text-green-600">매수</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {order.quantity.toLocaleString("ko-KR")}주 ×{" "}
                        {formatCurrency(order.estimated_price)} ={" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(order.estimated_amount)}
                        </span>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Net Cash Change */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">순 현금 변동</span>
            <span
              className={`text-xl font-bold ${
                netCashChange >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {netCashChange >= 0 ? "+" : ""}
              {formatCurrency(netCashChange)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {onStartProgressive && (
          <Button
            onClick={onStartProgressive}
            disabled={isStartingProgressive || hasActiveSession}
            className="gap-2"
          >
            <Play className="size-4" />
            {isStartingProgressive ? "시작 중..." : "리밸런싱 시작"}
          </Button>
        )}
        {onSaveToHistory && (
          <Button
            variant={onStartProgressive ? "outline" : "default"}
            onClick={onSaveToHistory}
            disabled={isSaved}
            className="gap-2"
          >
            <BookmarkPlus className="size-4" />
            {isSaved ? "저장 완료" : "기록만 저장"}
          </Button>
        )}
      </div>
    </div>
  );
}
