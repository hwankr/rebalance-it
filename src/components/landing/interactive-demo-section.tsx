"use client";

import { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Zap, BarChart3 } from "lucide-react";
import { fadeInUp } from "./animation-config";
import { usePresetDemo } from "@/hooks/use-preset-demo";
import { DemoPresetTabs } from "./demo-preset-tabs";
import { DemoAllocationSliders } from "./demo-allocation-sliders";
import { DemoDonutComparison } from "./demo-donut-comparison";
import { DemoTradeResults } from "./demo-trade-results";

export function InteractiveDemoSection() {
  const {
    presets,
    activePreset,
    setActivePreset,
    assets,
    allocations,
    setAllocation,
    allocationSum,
    totalAmount,
    setTotalAmount,
    sortedResults,
    totalDeviation,
  } = usePresetDemo();

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

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <m.div {...fadeInUp} className="mb-12 text-center">
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
            {/* Preset Tabs */}
            <DemoPresetTabs
              presets={presets}
              activePreset={activePreset}
              onPresetChange={(id) => {
                setActivePreset(id);
                setHasRun(false);
              }}
            />

            {/* Allocation Sliders + Sum Bar + Total Amount */}
            <DemoAllocationSliders
              assets={assets}
              allocations={allocations}
              onAllocationChange={setAllocation}
              allocationSum={allocationSum}
              totalAmount={totalAmount}
              onTotalAmountChange={setTotalAmount}
            />

            {/* CTA Button */}
            <m.button
              onClick={handleRebalance}
              disabled={allocationSum !== 100}
              whileTap={allocationSum === 100 ? { scale: 0.97 } : undefined}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`relative mt-4 w-full overflow-hidden rounded-xl px-6 py-3.5 text-base font-bold text-white transition-colors ${
                allocationSum !== 100
                  ? "cursor-not-allowed bg-muted text-muted-foreground opacity-50"
                  : isAnimating
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                    : "bg-gradient-to-r from-primary to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg"
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
            </m.button>
          </div>

          {/* Right Panel: Results */}
          <div className="flex flex-col gap-4 min-h-[360px]">
            <div>
              <p className="text-base font-bold text-foreground">
                리밸런싱 결과
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                왼쪽 비중을 조절하고 버튼을 눌러보세요
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!hasRun ? (
                /* Empty state */
                <m.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center"
                >
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
                </m.div>
              ) : (
                /* Results with donut charts + trade guide */
                <m.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col gap-5"
                >
                  {/* Before/After Donut Charts */}
                  <m.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="flex justify-center"
                  >
                    <DemoDonutComparison
                      assets={assets}
                      allocations={allocations}
                      totalDeviation={totalDeviation}
                    />
                  </m.div>

                  {/* Trade Results */}
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  >
                    <DemoTradeResults
                      sortedResults={sortedResults}
                      totalAmount={totalAmount}
                    />
                  </m.div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      </div>
    </section>
  );
}
