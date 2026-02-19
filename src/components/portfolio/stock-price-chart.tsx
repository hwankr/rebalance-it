"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartData } from "@/lib/rebalance/types";
import { DataSourceFooter } from "@/components/data-source-footer";

interface StockPriceChartProps {
  chartData: ChartData[];
  stockName: string;
  isLoading?: boolean;
  fetchedAt?: string | null;
  provider?: string;
}

const PERIOD_OPTIONS = [
  { label: "1개월", count: 22 },
  { label: "3개월", count: 66 },
  { label: "6개월", count: 132 },
] as const;

function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${month}/${day}`;
}

function formatPrice(value: number): string {
  return value.toLocaleString("ko-KR");
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartData }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">
        {data.date.slice(0, 4)}/{data.date.slice(4, 6)}/{data.date.slice(6, 8)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>시가</span>
        <span className="text-right">{formatPrice(data.open)}</span>
        <span>고가</span>
        <span className="text-right">{formatPrice(data.high)}</span>
        <span>저가</span>
        <span className="text-right">{formatPrice(data.low)}</span>
        <span>종가</span>
        <span className="text-right font-medium text-foreground">
          {formatPrice(data.close)}
        </span>
        <span>거래량</span>
        <span className="text-right">{data.volume.toLocaleString("ko-KR")}</span>
      </div>
    </div>
  );
}

export function StockPriceChart({
  chartData,
  stockName,
  isLoading,
  fetchedAt,
  provider,
}: StockPriceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((_, i) => (
              <div key={i} className="h-7 w-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="h-[250px] w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        차트 데이터가 없습니다.
      </div>
    );
  }

  const count = PERIOD_OPTIONS[selectedPeriod].count;
  const slicedData = chartData.slice(-count);

  const firstClose = slicedData[0]?.close ?? 0;
  const lastClose = slicedData[slicedData.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;

  const strokeColor = isUp ? "#ef4444" : "#3b82f6";
  const gradientId = "chartGradient";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{stockName} 시세</h3>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((option, i) => (
            <button
              key={option.label}
              onClick={() => setSelectedPeriod(i)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedPeriod === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={slicedData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>

      <DataSourceFooter fetchedAt={fetchedAt} provider={provider} />
    </div>
  );
}
