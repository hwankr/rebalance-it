"use client";

import { m } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "./animation-config";
import { Zap, Crown, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingPreviewSectionProps {
  onGuestStart: () => void;
}

const plans = [
  {
    name: "Free",
    price: "0",
    period: "원/월",
    highlights: ["리밸런싱 시뮬레이션 무제한", "포트폴리오 1개", "AI 텍스트 파싱 3회/일"],
    cta: "무료로 시작",
    variant: "free" as const,
  },
  {
    name: "Plus",
    price: "12,900",
    period: "원/월",
    badge: "추천",
    icon: Zap,
    highlights: ["포트폴리오 5개", "AI 이미지 파싱", "데이터 내보내기", "고급 분석"],
    cta: "Plus 알아보기",
    variant: "plus" as const,
  },
  {
    name: "Pro",
    price: "19,900",
    period: "원/월",
    icon: Crown,
    highlights: ["포트폴리오 10개", "모든 AI 무제한", "커스텀 전략", "우선 지원"],
    cta: "Pro 알아보기",
    variant: "pro" as const,
  },
];

export function PricingPreviewSection({ onGuestStart }: PricingPreviewSectionProps) {
  return (
    <section className="bg-muted/30 py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          {...fadeInUp}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-3 text-sm font-semibold text-primary">요금제</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            필요에 맞는 플랜을 선택하세요
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            기본 기능은 무료로 제공됩니다. 더 많은 기능이 필요하면 업그레이드하세요.
          </p>
        </m.div>

        {/* Card grid */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
        >
          {plans.map((plan) => (
            <m.div
              key={plan.name}
              variants={staggerItem}
              className={cn(
                "relative",
                plan.variant === "free" &&
                  "rounded-2xl border border-border/50 bg-card p-6",
                plan.variant === "plus" &&
                  "rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/5 p-6",
                plan.variant === "pro" &&
                  "rounded-2xl border-2 border-blue-500/60 bg-blue-500/5 p-6",
              )}
            >
              {/* Recommended badge */}
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white hover:bg-emerald-500">
                  {plan.badge}
                </Badge>
              )}

              {/* Plan name + icon */}
              <div className="mb-4 flex items-center gap-2">
                {plan.icon && (
                  <plan.icon
                    className={cn(
                      "size-5",
                      plan.variant === "plus" ? "text-emerald-500" : "text-blue-500",
                    )}
                  />
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              {/* Highlights */}
              <ul className="mb-6 space-y-2.5">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 shrink-0 text-primary" />
                    {h}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              {plan.variant === "free" && (
                <Button variant="outline" className="w-full" onClick={onGuestStart}>
                  {plan.cta}
                </Button>
              )}
              {plan.variant === "plus" && (
                <Button
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                  asChild
                >
                  <Link href="/pricing">{plan.cta}</Link>
                </Button>
              )}
              {plan.variant === "pro" && (
                <Button
                  className="w-full bg-blue-500 text-white hover:bg-blue-600"
                  asChild
                >
                  <Link href="/pricing">{plan.cta}</Link>
                </Button>
              )}
            </m.div>
          ))}
        </m.div>

        {/* Link below cards */}
        <m.div {...fadeInUp} className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
            모든 기능 비교하기 →
          </Link>
        </m.div>
      </div>
    </section>
  );
}
