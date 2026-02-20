"use client";

import { m } from "framer-motion";
import { fadeInUp } from "./animation-config";

const stats = [
  { value: "1,000+", label: "등록된 포트폴리오" },
  { value: "50,000+", label: "리밸런싱 시뮬레이션" },
  { value: "99.9%", label: "서비스 가용률" },
];

export function StatsSection() {
  return (
    <section className="py-12 md:py-20 border-b border-border/30">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <m.div
          {...fadeInUp}
          className="grid grid-cols-3 gap-4 md:gap-8"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
