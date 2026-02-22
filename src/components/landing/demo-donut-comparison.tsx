"use client";

import { m } from "framer-motion";
import { ArrowRight, ArrowDown, Check } from "lucide-react";
import type { Asset } from "@/hooks/use-preset-demo";

interface DemoDonutComparisonProps {
  assets: Asset[];
  allocations: Record<string, number>;
  totalDeviation: number;
}

const RADIUS = 70;
const STROKE_WIDTH = 18;
const circumference = 2 * Math.PI * RADIUS; // ≈ 439.82

interface Segment {
  id: string;
  color: string;
  dasharray: string;
  dashoffset: number;
}

function calculateSegments(
  percentages: { id: string; pct: number; color: string }[]
): Segment[] {
  let offset = 0;
  return percentages.map((seg) => {
    const length = (seg.pct / 100) * circumference;
    const dasharray = `${length} ${circumference - length}`;
    const dashoffset = -offset;
    offset += length;
    return { id: seg.id, color: seg.color, dasharray, dashoffset };
  });
}

function DonutChart({
  segments,
  centerContent,
}: {
  segments: Segment[];
  centerContent: React.ReactNode;
}) {
  return (
    <div className="relative inline-block">
      <svg
        width="160"
        height="160"
        viewBox="0 0 180 180"
        className="w-[130px] h-[130px] md:w-[160px] md:h-[160px]"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx="90"
          cy="90"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-muted/30"
          strokeDasharray={`${circumference} 0`}
          strokeLinecap="butt"
        />
        {segments.map((seg) => (
          <circle
            key={seg.id}
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerContent}
      </div>
    </div>
  );
}

export function DemoDonutComparison({
  assets,
  allocations,
  totalDeviation,
}: DemoDonutComparisonProps) {
  // Before: current allocations
  const beforeInput = assets.map((a) => ({
    id: a.id,
    pct: allocations[a.id] ?? 0,
    color: a.color,
  }));
  const beforeSegments = calculateSegments(beforeInput);

  // After: target allocations (perfectly rebalanced)
  const afterInput = assets.map((a) => ({
    id: a.id,
    pct: a.target,
    color: a.color,
  }));
  const afterSegments = calculateSegments(afterInput);

  const beforeCenter = (
    <>
      <span className="text-lg md:text-xl font-bold text-foreground leading-tight">
        {totalDeviation.toFixed(0)}%
      </span>
      <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
        현재 편차
      </span>
    </>
  );

  const afterCenter = (
    <>
      <Check className="w-4 h-4 text-emerald-500 mb-0.5" strokeWidth={3} />
      <span className="text-lg md:text-xl font-bold text-emerald-500 leading-tight">
        0%
      </span>
      <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
        목표 달성
      </span>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      {/* Before */}
      <m.div className="flex flex-col items-center gap-2">
        <DonutChart segments={beforeSegments} centerContent={beforeCenter} />
        <span className="text-sm font-medium text-foreground">리밸런싱 전</span>
      </m.div>

      {/* Arrow */}
      <div className="text-muted-foreground">
        <ArrowDown className="w-5 h-5 md:hidden" />
        <ArrowRight className="w-5 h-5 hidden md:block" />
      </div>

      {/* After */}
      <m.div className="flex flex-col items-center gap-2">
        <DonutChart segments={afterSegments} centerContent={afterCenter} />
        <span className="text-sm font-medium text-foreground">리밸런싱 후</span>
      </m.div>
    </div>
  );
}
