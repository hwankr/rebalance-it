"use client";

import { m } from "framer-motion";
import { Briefcase, Target, TrendingUp, ListChecks } from "lucide-react";
import { staggerContainer, staggerItem } from "./animation-config";

const features = [
  {
    icon: Briefcase,
    title: "간편한 포트폴리오 등록",
    description: "종목명을 검색하고 보유 수량만 입력하면 현재가가 자동 반영됩니다. 한국/미국 주식 모두 지원합니다.",
  },
  {
    icon: Target,
    title: "목표 비중 리밸런싱",
    description: "각 종목의 목표 비중(%)을 설정하면, 현재 비중과의 차이를 분석하여 매매 수량을 자동 계산합니다.",
  },
  {
    icon: TrendingUp,
    title: "실시간 시세 반영",
    description: "Yahoo Finance 연동으로 KOSPI, KOSDAQ, NYSE, NASDAQ 종목의 현재가를 자동으로 가져옵니다.",
  },
  {
    icon: ListChecks,
    title: "단계별 매매 가이드",
    description: "매도 우선 원칙에 따라 안전한 리밸런싱 순서를 안내합니다. 체크리스트로 하나씩 완료해 나가세요.",
  },
];

export function FeatureSection() {
  return (
    <section className="bg-muted/30 py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-3 text-sm font-semibold text-primary">주요 기능</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            투자를 더 쉽고 정확하게
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            리밸런싱에 필요한 모든 기능을 한곳에서 제공합니다.
          </p>
        </m.div>

        {/* Feature cards grid */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <m.div
                key={feature.title}
                variants={staggerItem}
                className="group rounded-3xl border border-border/50 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]"
              >
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20 md:mb-5">
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </m.div>
            );
          })}
        </m.div>
      </div>
    </section>
  );
}
