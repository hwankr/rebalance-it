"use client";

import { m } from "framer-motion";
import { PlusCircle, SlidersHorizontal, Rocket } from "lucide-react";
import { staggerContainer, staggerItem } from "./animation-config";

const steps = [
  {
    number: "1",
    icon: PlusCircle,
    title: "종목 등록",
    description: "보유 종목과 수량을 입력하세요.",
  },
  {
    number: "2",
    icon: SlidersHorizontal,
    title: "목표 설정",
    description: "원하는 목표 비중을 설정하세요.",
  },
  {
    number: "3",
    icon: Rocket,
    title: "리밸런싱 실행",
    description: "자동 계산된 매매 가이드를 따라 실행하세요.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-muted/30 py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-3 text-sm font-semibold text-primary">사용 방법</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            3단계로 끝나는 리밸런싱
          </h2>
        </m.div>

        {/* Steps */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6"
        >
          {/* Connecting line (desktop only) */}
          <div className="absolute top-12 left-[16.67%] right-[16.67%] hidden h-px border-t-2 border-dashed border-border md:block" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <m.div
                key={step.number}
                variants={staggerItem}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step number circle */}
                <div className="relative z-10 mb-4 flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm md:size-16 md:text-2xl">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="mb-3 flex size-10 items-center justify-center text-primary/70">
                  <Icon className="size-6" />
                </div>

                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </m.div>
            );
          })}
        </m.div>
      </div>
    </section>
  );
}
