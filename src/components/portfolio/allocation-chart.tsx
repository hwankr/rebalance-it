"use client";

import { useEffect, useId, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
  Label,
} from "recharts";
import type { PieSectorShapeProps } from "recharts";
import { useTheme } from "next-themes";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatCurrency } from "@/lib/utils/format";
import { StockLogo } from "@/components/stock-logo";

interface AllocationChartProps {
  stocks: Array<{ stock_name: string; eval_amount: number; stock_code: string; currency?: string }>;
  cash: number;
  totalValue: number;
  isLoading: boolean;
  activeStockCode?: string | null;
  onHoverChange?: (stockCode: string | null) => void;
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
  activeStockCode,
  onHoverChange,
}: AllocationChartProps) {
  const themeColors = useThemeColors();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const instanceId = useId();
  const { resolvedTheme } = useTheme();
  const [cardColor, setCardColor] = useState("#ffffff");

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--card")
        .trim();
      if (raw) {
        try {
          const el = document.createElement("div");
          el.style.color = raw;
          document.body.appendChild(el);
          const computed = getComputedStyle(el).color;
          document.body.removeChild(el);
          if (computed) setCardColor(computed);
        } catch {
          // fallback to default
        }
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [resolvedTheme]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <Skeleton />
      </div>
    );
  }

  const data = [
    ...(cash > 0 ? [{ name: "현금", value: cash, stock_code: "CASH", currency: undefined }] : []),
    ...stocks.map((s) => ({
      name: s.stock_name,
      value: s.eval_amount,
      stock_code: s.stock_code,
      currency: s.currency,
    })),
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = extendColors(themeColors, data.length);

  if (total === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
          데이터가 없습니다.
        </div>
      </div>
    );
  }

  const dataWithPercent = data.map((d) => ({
    ...d,
    percent: total > 0 ? d.value / total : 0,
  }));

  // Sync hover state: external activeStockCode takes priority over internal activeIndex
  const externalIndex = activeStockCode != null
    ? data.findIndex((d) => d.stock_code === activeStockCode)
    : -1;
  const hoveredIndex = externalIndex >= 0 ? externalIndex : activeIndex;

  const handleHoverEnter = (index: number) => {
    setActiveIndex(index);
    onHoverChange?.(data[index]?.stock_code ?? null);
  };

  const handleHoverLeave = () => {
    setActiveIndex(null);
    onHoverChange?.(null);
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
      {/* Card Header */}
      <h3 className="font-bold text-lg">자산 배분</h3>

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
              paddingAngle={0}
              dataKey="value"
              stroke={data.length > 1 ? cardColor : "none"}
              strokeWidth={data.length > 1 ? 1 : 0}
              onMouseEnter={(_, index) => handleHoverEnter(index)}
              onMouseLeave={handleHoverLeave}
              shape={(props: PieSectorShapeProps) => {
                const isHovered = hoveredIndex === props.index;
                return (
                  <Sector
                    {...props}
                    outerRadius={isHovered ? 90 : 85}
                    style={{
                      filter: isHovered
                        ? "drop-shadow(0px 4px 10px rgba(0,0,0,0.25))"
                        : "none",
                      opacity:
                        hoveredIndex !== null && !isHovered ? 0.65 : 1,
                      transition: "all 0.3s ease",
                    }}
                  />
                );
              }}
            >
              {dataWithPercent.map((_, index) => (
                <Cell
                  key={index}
                  fill={`url(#alloc-grad-${instanceId}-${index})`}
                />
              ))}
              <Label
                position="center"
                content={() => (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan
                      x="50%"
                      dy="-10"
                      fontSize={11}
                      className="fill-muted-foreground"
                    >
                      총 평가액
                    </tspan>
                    <tspan
                      x="50%"
                      dy="20"
                      fontSize={14}
                      fontWeight={700}
                      className="fill-foreground"
                    >
                      {formatCurrency(totalValue)}
                    </tspan>
                  </text>
                )}
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="max-h-[320px] overflow-y-auto space-y-3 px-0.5">
        {dataWithPercent.map((item, index) => {
          const pct = (item.percent * 100).toFixed(1);
          const isActive = hoveredIndex === index;
          return (
            <div
              key={index}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-default ${
                isActive
                  ? "bg-muted/80 shadow-sm"
                  : "hover:bg-muted/40"
              }`}
              onMouseEnter={() => handleHoverEnter(index)}
              onMouseLeave={handleHoverLeave}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.stock_code !== "CASH" ? (
                  <StockLogo stockCode={item.stock_code} stockName={item.name} currency={item.currency} size="sm" />
                ) : (
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ background: colors[index] }}
                  />
                )}
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
    </div>
  );
}
