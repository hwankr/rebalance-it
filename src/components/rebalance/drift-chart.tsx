"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DriftResult } from "@/lib/rebalance/types";
import { useThemeColors } from "@/hooks/use-theme-colors";

interface DriftChartProps {
  drifts: DriftResult[];
  threshold?: number;
  isLoading?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === "current_pct")?.value as number;
  const target = payload.find((p) => p.dataKey === "target_pct")?.value as number;
  const drift =
    current !== undefined && target !== undefined
      ? Math.round((target - current) * 100) / 100
      : 0;
  return (
    <div className="rounded-xl border border-border bg-popover/90 backdrop-blur-sm p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="profit-down">현재: {current}%</p>
      <p className="profit-up">목표: {target}%</p>
      <p className="text-muted-foreground">drift: {drift}%</p>
    </div>
  );
}

export function DriftChart({
  drifts,
  threshold = 5,
  isLoading,
}: DriftChartProps) {
  const themeColors = useThemeColors();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        <div className="h-48 w-full max-w-md skeleton-shimmer rounded-lg" />
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
    is_cash: d.stock_code === "CASH",
  }));

  const chartHeight = Math.max(300, drifts.length * 50);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart layout="vertical" data={data} margin={{ left: isMobile ? 5 : 20, right: isMobile ? 10 : 20 }}>
        <XAxis
          type="number"
          unit="%"
          domain={[0, "auto"]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: isMobile ? 11 : 12 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={isMobile ? 55 : 80}
          tick={{ fontSize: isMobile ? 11 : 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) =>
            value === "current_pct" ? "현재 비중" : "목표 비중"
          }
        />
        <ReferenceLine
          x={threshold}
          stroke="var(--destructive)"
          strokeDasharray="3 3"
          label={{ value: `임계값 ${threshold}%`, position: "top", fontSize: 11 }}
        />
        <Bar
          dataKey="current_pct"
          name="current_pct"
          barSize={16}
          radius={[0, 4, 4, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`current-${index}`}
              fill={entry.is_cash ? "#9ca3af" : themeColors[0] || "#4f46e5"}
            />
          ))}
        </Bar>
        <Bar
          dataKey="target_pct"
          name="target_pct"
          barSize={16}
          radius={[0, 4, 4, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`target-${index}`}
              fill={entry.is_cash ? "#d1d5db" : themeColors[2] || "#16a34a"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
