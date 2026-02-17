"use client";

import { cn } from "@/lib/utils";

interface WeightBulletChartProps {
  currentPct: number; // 0-100
  targetPct: number; // 0-100
  showLabels?: boolean; // show numeric labels, default: true
  compact?: boolean; // minimal mode, default: false
  className?: string;
}

export function WeightBulletChart({
  currentPct,
  targetPct,
  showLabels = true,
  compact = false,
  className,
}: WeightBulletChartProps) {
  const drift = currentPct - targetPct;
  const absDrift = Math.abs(drift);

  // Scale: 20% headroom
  const maxPct = Math.max(currentPct, targetPct, 1) * 1.2;

  // Color by drift severity
  const barColor =
    absDrift < 2
      ? "bg-emerald-500 dark:bg-emerald-400"
      : absDrift < 5
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-rose-500 dark:bg-rose-400";

  // Direction arrow for color-blind accessibility
  const directionArrow =
    absDrift < 0.5 ? "=" : drift > 0 ? "▲" : "▼";

  // Diff badge color
  const diffColor =
    absDrift < 2
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
      : absDrift < 5
        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
        : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30";

  // Widths as percentages
  const currentWidth = maxPct > 0 ? (currentPct / maxPct) * 100 : 0;
  const targetPosition = maxPct > 0 ? (targetPct / maxPct) * 100 : 0;

  const ariaLabel = `현재 비중 ${currentPct.toFixed(1)}%, 목표 비중 ${targetPct.toFixed(1)}%, 차이 ${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%`;

  return (
    <div className={cn("w-full", className)}>
      {/* Bar container */}
      <div
        className={cn(
          "relative w-full min-w-[120px] bg-muted rounded",
          compact ? "h-3" : "h-5"
        )}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Current weight bar */}
        {currentPct > 0 && (
          <div
            className={cn("absolute left-0 top-0 h-full rounded-l", barColor)}
            style={{ width: `${currentWidth}%` }}
          />
        )}

        {/* Target weight marker */}
        {targetPct > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/50"
            style={{ left: `${targetPosition}%` }}
          />
        )}
      </div>

      {/* Labels */}
      {showLabels && !compact && (
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>현재 {currentPct.toFixed(1)}%</span>
          {absDrift >= 0.5 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                diffColor
              )}
            >
              {directionArrow} {drift >= 0 ? "+" : ""}
              {drift.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Compact mode: minimal diff badge */}
      {compact && absDrift >= 0.5 && (
        <div
          className={cn(
            "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
            diffColor
          )}
        >
          {directionArrow} {drift >= 0 ? "+" : ""}
          {drift.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
