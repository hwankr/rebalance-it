"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface AllocationChartProps {
  stocks: Array<{ stock_name: string; eval_amount: number }>;
  cash: number;
  totalValue: number;
  isLoading: boolean;
}

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#e11d48", "#65a30d", "#c026d3", "#ea580c",
  "#6366f1", "#14b8a6",
];

function Skeleton() {
  return (
    <div className="flex items-center justify-center h-[300px]">
      <div className="h-48 w-48 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

export function AllocationChart({ stocks, cash, totalValue, isLoading }: AllocationChartProps) {
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
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              `${Number(value).toLocaleString("ko-KR")}원`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">총 평가액</p>
          <p className="text-sm font-semibold">{totalValue.toLocaleString("ko-KR")}원</p>
        </div>
      </div>
    </div>
  );
}
