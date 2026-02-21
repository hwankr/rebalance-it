"use client";

import { TrendingUp, TrendingDown, PieChart, History } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { HistoryStats } from "@/lib/rebalance/history-stats";

interface HistorySummaryCardsProps {
  stats: HistoryStats;
}

export function HistorySummaryCards({ stats }: HistorySummaryCardsProps) {
  const isPositiveProfit = stats.cumulativeProfit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Card 1: Cumulative Profit */}
      <div className="bg-card rounded-xl shadow-sm border p-5 md:p-6 transition-transform hover:-translate-y-1 duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              총 누적 수익
            </p>
            <h3
              className={cn(
                "mt-2 text-2xl font-bold tabular-nums",
                isPositiveProfit
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {isPositiveProfit ? "+" : ""}
              {formatCurrency(stats.cumulativeProfit)}
            </h3>
          </div>
          <span
            className={cn(
              "inline-flex items-center justify-center p-2 rounded-lg",
              isPositiveProfit
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30",
            )}
          >
            {isPositiveProfit ? (
              <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
            )}
          </span>
        </div>
        <div className="mt-4 flex items-center text-sm">
          {stats.monthOverMonthChange !== 0 ? (
            <>
              <span
                className={cn(
                  "font-medium flex items-center",
                  stats.monthOverMonthChange > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {stats.monthOverMonthChange > 0 ? (
                  <TrendingUp className="size-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="size-3.5 mr-0.5" />
                )}
                {Math.abs(stats.monthOverMonthChange).toFixed(1)}%
              </span>
              <span className="ml-2 text-muted-foreground">지난달 대비</span>
            </>
          ) : (
            <span className="text-muted-foreground">이전 월 데이터 없음</span>
          )}
        </div>
      </div>

      {/* Card 2: Success Rate */}
      <div className="bg-card rounded-xl shadow-sm border p-5 md:p-6 transition-transform hover:-translate-y-1 duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              리밸런싱 성공률
            </p>
            <h3 className="mt-2 text-2xl font-bold tabular-nums">
              {stats.successRate.toFixed(1)}%
            </h3>
          </div>
          <span className="inline-flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <PieChart className="size-5 text-blue-500" />
          </span>
        </div>
        <div className="mt-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.successRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card 3: Monthly Execution Count */}
      <div className="bg-card rounded-xl shadow-sm border p-5 md:p-6 transition-transform hover:-translate-y-1 duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              이번 달 실행 횟수
            </p>
            <h3 className="mt-2 text-2xl font-bold tabular-nums">
              {stats.currentMonthCount}회
            </h3>
          </div>
          <span className="inline-flex items-center justify-center p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <History className="size-5 text-indigo-500" />
          </span>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-muted-foreground">
            {stats.lastExecutionDate
              ? `최근 실행: ${format(new Date(stats.lastExecutionDate), "yyyy.MM.dd")}`
              : "실행 기록 없음"}
          </span>
        </div>
      </div>
    </div>
  );
}
