"use client";

import { m } from "framer-motion";
import { ShieldCheck, Lock, Eye } from "lucide-react";
import { staggerContainer, staggerItem } from "./animation-config";

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: "안전한 데이터 처리",
    description:
      "모든 데이터는 암호화되어 전송되며, Supabase의 보안 인프라로 보호됩니다.",
  },
  {
    icon: Lock,
    title: "비회원 모드",
    description:
      "계정 없이도 사용 가능합니다. 비회원 데이터는 브라우저에만 저장되어 서버에 전송되지 않습니다.",
  },
  {
    icon: Eye,
    title: "투명한 데이터 정책",
    description:
      "수집하는 데이터를 최소화하며, 개인정보처리방침을 통해 투명하게 공개합니다.",
  },
];

export function SecuritySection() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-3 text-sm font-semibold text-primary">
            보안 & 신뢰
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            안심하고 사용하세요
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            여러분의 소중한 투자 데이터를 안전하게 보호합니다.
          </p>
        </m.div>

        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {securityFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <m.div
                key={feature.title}
                variants={staggerItem}
                className="flex flex-col items-center rounded-3xl border border-border/50 bg-card p-6 text-center md:p-8"
              >
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
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
