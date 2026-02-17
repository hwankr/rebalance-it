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
  const isOver = drift > 0;

  // Scale: 20% headroom
  const maxPct = Math.max(currentPct, targetPct, 1) * 1.2;

  // Directional color: orange for over-target, blue for under-target
  const barColor = isOver
    ? "bg-orange-500 dark:bg-orange-400"
    : "bg-blue-500 dark:bg-blue-400";

  // Widths as percentages
  const currentWidth = maxPct > 0 ? (currentPct / maxPct) * 100 : 0;
  const targetPosition = maxPct > 0 ? (targetPct / maxPct) * 100 : 0;

  const ariaLabel = `현재 비중 ${currentPct.toFixed(1)}%, 목표 비중 ${targetPct.toFixed(1)}%, 차이 ${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%`;

  return (
    <div className={cn("w-full", className)}>
      {/* Outer spacer: provides vertical room for marker overshoot + floating label */}
      <div
        className={cn(
          "relative w-full min-w-[120px] flex items-center",
          compact ? "h-6" : "h-8"
        )}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Inner track */}
        <div
          className={cn(
            "relative w-full bg-muted rounded-full",
            compact ? "h-1.5" : "h-2"
          )}
        >
          {/* Current weight bar */}
          {currentPct > 0 && (
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-[width] duration-300",
                barColor
              )}
              style={{ width: `${currentWidth}%` }}
            />
          )}

          {/* Target weight marker */}
          {targetPct > 0 && (
            <div
              className="absolute w-0.5 bg-foreground z-10"
              style={{
                left: `${targetPosition}%`,
                top: "-4px",
                bottom: "-4px",
              }}
            >
              {/* Floating target label (normal mode only) */}
              {!compact && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                  {targetPct.toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current percentage label */}
      {showLabels && (
        <div
          className={cn(
            "text-muted-foreground tabular-nums",
            compact ? "text-[10px] mt-0.5" : "text-xs mt-1"
          )}
        >
          현재 {currentPct.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
