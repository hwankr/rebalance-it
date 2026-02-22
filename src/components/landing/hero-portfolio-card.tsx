"use client";

import { m } from "framer-motion";

const PORTFOLIO_ITEMS = [
  {
    ticker: "VOO",
    name: "미국 주식",
    pct: 40,
    color: "#2563eb",
    drift: "+5%↑",
    driftType: "over" as const,
  },
  {
    ticker: "KODEX",
    name: "한국 주식",
    pct: 30,
    color: "#10b981",
    drift: "-3%↓",
    driftType: "under" as const,
  },
  {
    ticker: "TLT",
    name: "채권",
    pct: 20,
    color: "#f59e0b",
    drift: "적정",
    driftType: "ok" as const,
  },
  {
    ticker: "GLD",
    name: "금",
    pct: 10,
    color: "#8b5cf6",
    drift: "-2%↓",
    driftType: "under" as const,
  },
];

// SVG donut: r=70, viewBox 180x180, stroke-width=18
// circumference = 2 * pi * 70 ≈ 440
const SEGMENTS = [
  { color: "#2563eb", dasharray: "176 264", offset: 0 },
  { color: "#10b981", dasharray: "132 308", offset: -176 },
  { color: "#f59e0b", dasharray: "88 352", offset: -308 },
  { color: "#8b5cf6", dasharray: "44 396", offset: -396 },
];

const floatAnimation = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const floatAnimationDelayed = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: 1.2,
    },
  },
};

function DriftBadge({ type, label }: { type: "over" | "under" | "ok"; label: string }) {
  if (type === "over") {
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
        {label}
      </span>
    );
  }
  if (type === "under") {
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
        {label}
      </span>
    );
  }
  return (
    <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
      {label}
    </span>
  );
}

export function HeroPortfolioCard() {
  return (
    <div className="relative w-full">
      {/* Main card */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-lg relative overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#10b981]" />

        <div className="p-6 md:p-8">
          {/* Card title */}
          <p className="text-sm font-semibold text-foreground mb-5">
            📊 내 포트폴리오 현황
          </p>

          {/* Donut chart */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <svg
                width="180"
                height="180"
                viewBox="0 0 180 180"
                style={{ transform: "rotate(-90deg)" }}
                aria-hidden="true"
              >
                {SEGMENTS.map((seg, i) => (
                  <circle
                    key={i}
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-foreground leading-tight">
                  ₩12.5M
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  총 평가금액
                </span>
              </div>
            </div>
          </div>

          {/* Portfolio items */}
          <div className="flex flex-col gap-2">
            {PORTFOLIO_ITEMS.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-muted/40"
              >
                <span
                  className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({item.ticker})
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground mr-2">
                  {item.pct}%
                </span>
                <DriftBadge type={item.driftType} label={item.drift} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge: top-right - "리밸런싱 완료!" */}
      <m.div
        animate={floatAnimation.animate}
        className="absolute -top-4 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 shadow-md"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 text-xs">
          ✓
        </span>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          리밸런싱 완료!
        </span>
      </m.div>

      {/* Floating badge: bottom-left - "실시간 분석 중" */}
      <m.div
        animate={floatAnimationDelayed.animate}
        className="absolute -bottom-4 -left-3 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 shadow-md"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-blue-500 text-xs">
          ●
        </span>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          실시간 분석 중
        </span>
      </m.div>
    </div>
  );
}
