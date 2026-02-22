"use client";

import { m } from "framer-motion";
import { FileText, ImageIcon, Search, BookOpen, BarChart3 } from "lucide-react";
import { staggerContainer, staggerItem, fadeInUp } from "./animation-config";
import { Badge } from "@/components/ui/badge";

const aiFeatures = [
  {
    icon: FileText,
    title: "AI 텍스트 파싱",
    description: "증권사 잔고를 텍스트로 붙여넣으면 종목과 수량을 자동으로 인식합니다.",
    tier: "Free 3회/일",
    tierVariant: "secondary" as const,
  },
  {
    icon: ImageIcon,
    title: "AI 이미지 파싱",
    description: "증권사 앱 캡처 화면을 업로드하면 보유 종목을 자동으로 추출합니다.",
    tier: "Plus",
    tierVariant: "plus" as const,
  },
  {
    icon: Search,
    title: "AI 종목 검색",
    description: "자연어로 종목을 검색하세요. \"반도체 관련주\", \"배당 높은 미국 ETF\" 등을 이해합니다.",
    tier: "Free 5회/일",
    tierVariant: "secondary" as const,
  },
  {
    icon: BookOpen,
    title: "AI 종목 요약",
    description: "개별 종목의 사업 개요, 재무 지표, 최근 이슈를 AI가 한눈에 정리해드립니다.",
    tier: "Plus",
    tierVariant: "plus" as const,
  },
  {
    icon: BarChart3,
    title: "AI 세션 리포트",
    description: "리밸런싱 결과를 AI가 분석하여 포트폴리오 변화와 개선점을 리포트로 제공합니다.",
    tier: "Plus",
    tierVariant: "plus" as const,
  },
];

export function AiFeatureSection() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          {...fadeInUp}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-3 text-sm font-semibold text-primary">AI 기능</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            AI가 도와주는 스마트한 투자 관리
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            복잡한 입력은 AI에게 맡기고, 중요한 투자 결정에 집중하세요.
          </p>
        </m.div>

        {/* Card grid */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
        >
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <m.div
                key={feature.title}
                variants={staggerItem}
                className="relative rounded-3xl border border-border/50 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]"
              >
                {/* Tier badge - top right */}
                <div className="absolute top-5 right-5 md:top-7 md:right-7">
                  {feature.tierVariant === "secondary" ? (
                    <Badge variant="secondary" className="text-xs">
                      {feature.tier}
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {feature.tier}
                    </span>
                  )}
                </div>

                {/* Icon with gradient bg */}
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary md:mb-5">
                  <Icon className="size-6" />
                </div>

                <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground pr-16">
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
