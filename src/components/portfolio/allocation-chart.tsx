"use client";

import { useId, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatCurrency } from "@/lib/utils/format";

interface AllocationChartProps {
  stocks: Array<{ stock_name: string; eval_amount: number }>;
  cash: number;
  totalValue: number;
  isLoading: boolean;
}

function extendColors(base: string[], count: number): string[] {
  const extended = [...base];
  while (extended.length < count) {
    extended.push(base[extended.length % base.length]);
  }
  return extended;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center h-[240px]">
        <div className="h-40 w-40 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 skeleton-shimmer rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = ((item.payload.percent ?? 0) * 100).toFixed(1);
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg z-50">
      <p className="font-semibold text-sm">{item.name}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {formatCurrency(Number(item.value))} · {pct}%
      </p>
    </div>
  );
}

export function AllocationChart({
  stocks,
  cash,
  totalValue,
  isLoading,
}: AllocationChartProps) {
  const themeColors = useThemeColors();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const instanceId = useId();

  if (isLoading) {
    return <Skeleton />;
  }

  const data = [
    ...stocks.map((s) => ({
      name: s.stock_name,
      value: s.eval_amount,
    })),
    ...(cash > 0 ? [{ name: "현금", value: cash }] : []),
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = extendColors(themeColors, data.length);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
        데이터가 없습니다.
      </div>
    );
  }

  const dataWithPercent = data.map((d) => ({
    ...d,
    percent: total > 0 ? d.value / total : 0,
  }));

  return (
    <div className="space-y-3">
      {/* Donut Chart */}
      <div className="relative h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {dataWithPercent.map((_, index) => (
                <linearGradient
                  key={`grad-${index}`}
                  id={`alloc-grad-${instanceId}-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[index]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[index]}
                    stopOpacity={1}
                  />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={data.length > 1 ? 4 : 0}
              cornerRadius={6}
              dataKey="value"
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {dataWithPercent.map((_, index) => (
                <Cell
                  key={index}
                  fill={`url(#alloc-grad-${instanceId}-${index})`}
                  style={{
                    filter:
                      activeIndex === index
                        ? "drop-shadow(0px 3px 8px rgba(0,0,0,0.2))"
                        : "none",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay - hidden on hover to avoid tooltip overlap */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 transition-opacity duration-200 ${
            activeIndex !== null ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="text-xs text-muted-foreground font-medium">
            총 평가액
          </span>
          <span className="text-base font-bold text-foreground tabular-nums tracking-tight mt-0.5 max-w-[100px] truncate">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {/* Custom Legend */}
      <div className="max-h-[320px] overflow-y-auto space-y-1 px-0.5">
        {dataWithPercent.map((item, index) => {
          const pct = (item.percent * 100).toFixed(1);
          const isActive = activeIndex === index;
          return (
            <div
              key={index}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-default ${
                isActive
                  ? "bg-muted/80 shadow-sm"
                  : "hover:bg-muted/40"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: colors[index] }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(item.value)}
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums w-14 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
