"use client";

import { m } from "framer-motion";
import {
  Briefcase,
  Target,
  TrendingUp,
  ListChecks,
  Shield,
  Moon,
} from "lucide-react";
import { staggerContainer, staggerItem } from "./animation-config";

const features = [
  {
    icon: Briefcase,
    title: "간편한 자산 관리",
    description: "복잡한 엑셀 없이, 보유 종목과 비중을 한눈에 파악하세요.",
  },
  {
    icon: Target,
    title: "목표 비중 리밸런싱",
    description:
      "원하는 비중을 설정하면, 매매 수량을 자동으로 계산해드립니다.",
  },
  {
    icon: TrendingUp,
    title: "실시간 시세 연동",
    description: "한국/미국 주식 실시간 가격이 자동으로 반영됩니다.",
  },
  {
    icon: ListChecks,
    title: "단계별 매매 가이드",
    description:
      "매도 우선 원칙으로 안전한 리밸런싱 순서를 안내해드립니다.",
  },
  {
    icon: Shield,
    title: "프라이버시 중심",
    description:
      "비회원 모드 지원, 데이터는 브라우저에만 안전하게 저장됩니다.",
  },
  {
    icon: Moon,
    title: "다크 모드 지원",
    description: "눈이 편한 다크 모드로 언제 어디서나 사용하세요.",
  },
];

export function FeatureSection() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
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

        {/* Mobile: horizontal snap scroll / Desktop: 3-col grid */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <m.div
                key={feature.title}
                variants={staggerItem}
                className="group w-[80vw] flex-none snap-center rounded-3xl border border-border/50 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:w-[60vw] md:w-auto md:p-8 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]"
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
