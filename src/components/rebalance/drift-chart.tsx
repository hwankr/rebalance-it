"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DriftResult } from "@/lib/rebalance/types";

interface DriftChartProps {
  drifts: DriftResult[];
  threshold?: number;
  isLoading?: boolean;
}

export function DriftChart({
  drifts,
  threshold = 5,
  isLoading,
}: DriftChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        차트 데이터를 불러오는 중...
      </div>
    );
  }

  if (drifts.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const data = drifts.map((d) => ({
    name: d.stock_name,
    current_pct: Math.round(d.current_pct * 100) / 100,
    target_pct: Math.round(d.target_pct * 100) / 100,
    drift_pct: Math.round(d.drift_pct * 100) / 100,
  }));

  const chartHeight = Math.max(300, drifts.length * 50);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart layout="vertical" data={data} margin={{ left: 20, right: 20 }}>
        <XAxis
          type="number"
          unit="%"
          domain={[0, "auto"]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const current = payload.find(
              (p) => p.dataKey === "current_pct"
            )?.value as number;
            const target = payload.find(
              (p) => p.dataKey === "target_pct"
            )?.value as number;
            const drift =
              current !== undefined && target !== undefined
                ? Math.round((target - current) * 100) / 100
                : 0;
            return (
              <div className="rounded-md border bg-background p-2 text-sm shadow-sm">
                <p className="font-medium">{label}</p>
                <p className="text-blue-500">현재: {current}%</p>
                <p className="text-green-500">목표: {target}%</p>
                <p className="text-muted-foreground">drift: {drift}%</p>
              </div>
            );
          }}
        />
        <Legend
          formatter={(value: string) =>
            value === "current_pct" ? "현재 비중" : "목표 비중"
          }
        />
        <ReferenceLine
          x={threshold}
          stroke="red"
          strokeDasharray="3 3"
          label={{ value: `임계값 ${threshold}%`, position: "top", fontSize: 11 }}
        />
        <Bar dataKey="current_pct" fill="#3b82f6" name="current_pct" barSize={16} />
        <Bar dataKey="target_pct" fill="#22c55e" name="target_pct" barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
