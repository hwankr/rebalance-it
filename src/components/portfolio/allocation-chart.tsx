"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme-colors";

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

function Skeleton() {
  return (
    <div className="flex items-center justify-center h-[300px]">
      <div className="h-48 w-48 rounded-full skeleton-shimmer" />
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
        {Number(item.value).toLocaleString("ko-KR")}원
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

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }: { name?: string; percent?: number }) => {
              const p = percent ?? 0;
              return p >= 0.05 ? `${name ?? ""} ${(p * 100).toFixed(1)}%` : "";
            }}
            labelLine={true}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">총 평가액</p>
          <p className="text-sm font-bold text-gradient tabular-nums">{totalValue.toLocaleString("ko-KR")}원</p>
        </div>
      </div>
    </div>
  );
}
