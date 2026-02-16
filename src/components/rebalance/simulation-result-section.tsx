"use client";

import { m } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DriftChart } from "@/components/rebalance/drift-chart";
import { OrderPreview } from "@/components/rebalance/order-preview";
import { formatCurrency } from "@/lib/utils/format";
import type { RebalanceResult } from "@/lib/rebalance/types";
import { AlertCircle } from "lucide-react";

interface SimulationResultSectionProps {
  result: RebalanceResult & { cash_sufficient: boolean; cash_shortfall: number };
  threshold: number;
}

export function SimulationResultSection({
  result,
  threshold,
}: SimulationResultSectionProps) {
  const buyOrders = result.orders.filter((o) => o.side === "buy");
  const sellOrders = result.orders.filter((o) => o.side === "sell");

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 md:space-y-4"
    >
      {/* Drift Chart */}
      <Card>
        <CardHeader>
          <CardTitle>비중 편차 차트</CardTitle>
          <CardDescription>
            목표 비중 대비 현재 비중 편차 (임계값: {threshold}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriftChart drifts={result.drift_before} threshold={threshold} />
        </CardContent>
      </Card>

      {/* Order Preview */}
      <Card>
        <CardHeader>
          <CardTitle>매매 안내 미리보기</CardTitle>
          <CardDescription>
            리밸런싱을 위한 예상 매매 내역입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderPreview
            orders={result.orders}
            totalBuyAmount={result.total_buy_amount}
            totalSellAmount={result.total_sell_amount}
            netCashChange={result.net_cash_change}
          />
        </CardContent>
      </Card>

      {/* Cash Insufficient Warning */}
      {!result.cash_sufficient && (
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-950/30"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                현금이 부족합니다
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                리밸런싱을 완료하려면{" "}
                <span className="font-semibold">
                  {formatCurrency(result.cash_shortfall)}
                </span>
                의 현금이 추가로 필요합니다.
              </p>
            </div>
          </div>
        </m.div>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>예상 결과 요약</CardTitle>
          <CardDescription>
            시뮬레이션 기준 매매 결과입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Buy Count */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">매수</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {buyOrders.length}
                </p>
                <p className="text-sm text-muted-foreground">건</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(result.total_buy_amount)}
              </p>
            </div>

            {/* Sell Count */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">매도</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                  {sellOrders.length}
                </p>
                <p className="text-sm text-muted-foreground">건</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(result.total_sell_amount)}
              </p>
            </div>

            {/* Net Cash Change */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">순현금변동</p>
              <div className="flex items-baseline gap-2">
                <p
                  className={`text-2xl font-bold ${
                    result.net_cash_change > 0
                      ? "text-green-600 dark:text-green-500"
                      : result.net_cash_change < 0
                        ? "text-red-600 dark:text-red-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {result.net_cash_change > 0 ? "+" : ""}
                  {formatCurrency(result.net_cash_change)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                매도액 - 매수액
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
