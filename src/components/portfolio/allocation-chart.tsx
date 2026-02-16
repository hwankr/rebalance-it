"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  type PieLabelRenderProps,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatCurrency } from "@/lib/utils/format";

interface AllocationChartProps {
  stocks: Array<{ stock_name: string; eval_amount: number }>;
  cash: number;
  totalValue: number;
  isLoading: boolean;
}

// Extended palette: repeat theme colors with slight variations
function extendColors(base: string[], count: number): string[] {
  const extended = [...base];
  while (extended.length < count) {
    extended.push(base[extended.length % base.length]);
  }
  return extended;
}

const RADIAN = Math.PI / 180;
const MAX_NAME_LENGTH = 4;
const MIN_PERCENT_FOR_LABEL = 0.05;
const MAX_LABELED_SEGMENTS = 6;

function truncateName(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  return name.slice(0, MAX_NAME_LENGTH) + "...";
}

function renderCustomLabel(
  props: PieLabelRenderProps,
  labelledIndices: Set<number>,
) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  const name = String(props.name ?? "");
  const index = Number(props.index ?? 0);

  if (percent < MIN_PERCENT_FOR_LABEL || !labelledIndices.has(index)) {
    return null;
  }

  const radius = outerRadius + 14;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = midAngle > 90 && midAngle < 270 ? "end" : "start";

  const displayName = truncateName(name);
  const displayPercent = `${(percent * 100).toFixed(1)}%`;

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={11}
      className="fill-foreground"
    >
      {displayName} {displayPercent}
    </text>
  );
}

function Skeleton() {
  return (
    <div className="flex items-center justify-center h-[300px]">
      <div className="h-40 w-40 rounded-full skeleton-shimmer" />
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover/90 backdrop-blur-sm p-3 shadow-lg">
      <p className="font-medium text-sm">{item.name}</p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {formatCurrency(Number(item.value))}
      </p>
    </div>
  );
}

export function AllocationChart({ stocks, cash, totalValue, isLoading }: AllocationChartProps) {
  const themeColors = useThemeColors();

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
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  // Determine which segments get labels (top N by value, above threshold)
  const labelledIndices = new Set<number>();
  if (data.length <= MAX_LABELED_SEGMENTS) {
    data.forEach((_, i) => labelledIndices.add(i));
  } else {
    const sorted = data
      .map((d, i) => ({ value: d.value, index: i }))
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_LABELED_SEGMENTS);
    sorted.forEach((s) => labelledIndices.add(s.index));
  }

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={80}
            dataKey="value"
            label={(props: PieLabelRenderProps) =>
              renderCustomLabel(props, labelledIndices)
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 36 }}>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">총 평가액</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(totalValue)}</p>
        </div>
      </div>
    </div>
  );
}
