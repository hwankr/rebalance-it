"use client";

import { useState, useRef, useEffect } from "react";
import { m } from "framer-motion";
import { Zap, BarChart3 } from "lucide-react";
import { fadeInUp, staggerContainer, staggerItem } from "./animation-config";

const ASSETS = [
  { id: "us", name: "미국 주식", target: 40, color: "#2563eb" },
  { id: "kr", name: "한국 주식", target: 30, color: "#10b981" },
  { id: "bond", name: "채권", target: 20, color: "#f59e0b" },
  { id: "gold", name: "금", target: 10, color: "#8b5cf6" },
] as const;

const TOTAL_AMOUNT = 10_000_000;

export function InteractiveDemoSection() {
  const [allocations, setAllocations] = useState<Record<string, number>>({
    us: 52,
    kr: 22,
    bond: 18,
    gold: 8,
  });
  const [hasRun, setHasRun] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRebalance = () => {
    setHasRun(true);
    setIsAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsAnimating(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const results = ASSETS.map((a) => ({
    ...a,
    diff: allocations[a.id] - a.target,
    amount: Math.abs(
      Math.round(((allocations[a.id] - a.target) / 100) * TOTAL_AMOUNT)
    ),
    action:
      allocations[a.id] - a.target > 1
        ? ("매도" as const)
        : allocations[a.id] - a.target < -1
          ? ("매수" as const)
          : ("유지" as const),
  }));

  const totalDeviation = ASSETS.reduce(
    (sum, a) => sum + Math.abs(allocations[a.id] - a.target),
    0
  );

  const sortedResults = [...results].sort(
    (a, b) => Math.abs(b.diff) - Math.abs(a.diff)
  );

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          {...fadeInUp}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-semibold text-primary">
            ✦ 직접 체험해보세요
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            리밸런싱, 30초만에 이해하기
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            아래 슬라이더로 현재 포트폴리오 비중을 조절한 뒤 리밸런싱 버튼을
            눌러보세요. 목표 비중과의 차이를 분석하고 매매 가이드를 제공합니다.
          </p>
        </m.div>

        {/* Demo container */}
        <m.div
          {...fadeInUp}
          className="demo-range relative mt-12 grid grid-cols-1 gap-6 rounded-2xl border border-border/50 bg-card p-5 shadow-lg md:grid-cols-[minmax(300px,340px)_1fr] md:gap-8 md:p-8"
        >
          {/* Decorative gradient blob */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #2563eb 0%, #8b5cf6 60%, transparent 100%)",
            }}
          />

          {/* Left Panel: Input */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-base font-bold text-foreground">
                현재 비중 설정
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                슬라이더를 움직여서 현재 보유 비중을 입력해보세요
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {ASSETS.map((asset) => (
                <div key={asset.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className="inline-block h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: asset.color }}
                      />
                      {asset.name}
                      <span className="text-xs text-muted-foreground">
                        (목표: {asset.target}%)
                      </span>
                    </label>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {allocations[asset.id]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={allocations[asset.id]}
                    onChange={(e) =>
                      setAllocations((prev) => ({
                        ...prev,
                        [asset.id]: Number(e.target.value),
                      }))
                    }
                    className="demo-slider w-full"
                    aria-label={asset.name + " 현재 비중"}
                  />
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleRebalance}
              className={`relative mt-4 w-full overflow-hidden rounded-xl px-6 py-3.5 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                isAnimating
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  : "bg-gradient-to-r from-primary to-indigo-500"
              }`}
            >
              {isAnimating ? (
                <span className="flex items-center justify-center gap-2">
                  ✓ 분석 완료!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="size-5" />
                  리밸런싱 실행하기
                  <div className="absolute inset-0 -translate-x-full animate-[demo-button-shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </span>
              )}
            </button>
          </div>

          {/* Right Panel: Results */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-base font-bold text-foreground">
                리밸런싱 결과
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                왼쪽 비중을 조절하고 버튼을 눌러보세요
              </p>
            </div>

            {!hasRun ? (
              /* Empty state */
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                  <BarChart3 className="size-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground">
                  아직 결과가 없어요
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  슬라이더로 비중을 조절한 뒤 &apos;리밸런싱 실행하기&apos;를
                  눌러보세요
                </p>
              </div>
            ) : (
              /* Results */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Total deviation card */}
                <div className="rounded-xl bg-muted/50 p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    총 괴리도
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-foreground">
                    {totalDeviation}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    목표 대비 전체 편차
                  </p>
                </div>

                {/* After rebalancing card */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    리밸런싱 후
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-emerald-500">
                    0%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    편차 완벽 해소
                  </p>
                </div>

                {/* Trade guide */}
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    매매 가이드 (총 평가금액 ₩10,000,000 기준)
                  </p>
                  <m.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="rounded-xl border border-border/50 bg-muted/30"
                  >
                    {sortedResults.map((item, index) => (
                      <m.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.12 }}
                        className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                            item.action === "매도"
                              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                              : item.action === "매수"
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.action}
                        </span>
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {item.action === "유지"
                            ? "—"
                            : `₩${item.amount.toLocaleString("ko-KR")}`}
                        </span>
                      </m.div>
                    ))}
                  </m.div>
                </div>
              </div>
            )}
          </div>
        </m.div>
      </div>
    </section>
  );
}
