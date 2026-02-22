"use client";

import { m } from "framer-motion";
import { fadeInUp } from "./animation-config";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "비회원으로도 사용할 수 있나요?",
    answer:
      "네, 회원가입 없이 비회원 모드로 바로 사용할 수 있습니다. 비회원 모드에서는 데이터가 브라우저에만 저장되며, 다른 기기에서는 접근할 수 없습니다. 회원가입 후 클라우드 동기화가 가능합니다.",
  },
  {
    question: "리밸런싱이란 무엇인가요?",
    answer:
      "리밸런싱은 포트폴리오의 자산 비중을 목표 비중에 맞게 재조정하는 과정입니다. 시간이 지나면 주가 변동으로 인해 비중이 목표와 달라지는데, 리밸런싱을 통해 원래 계획한 비중으로 되돌릴 수 있습니다.",
  },
  {
    question: "어떤 주식을 지원하나요?",
    answer:
      "한국 주식(KOSPI, KOSDAQ)과 미국 주식(NYSE, NASDAQ)을 지원합니다. Yahoo Finance를 통해 실시간 시세가 자동으로 반영됩니다.",
  },
  {
    question: "수수료가 있나요?",
    answer:
      "기본 기능은 무료로 사용할 수 있습니다. 더 많은 포트폴리오와 고급 기능이 필요하시다면 요금제 페이지를 확인해주세요.",
  },
  {
    question: "내 데이터는 안전한가요?",
    answer:
      "모든 데이터는 암호화되어 전송되며, Supabase의 보안 인프라로 안전하게 보호됩니다. 비회원 모드에서는 데이터가 서버에 전송되지 않고 브라우저에만 저장됩니다.",
  },
];

export function FaqSection() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        {/* Section heading */}
        <m.div
          {...fadeInUp}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-semibold text-primary">FAQ</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            자주 묻는 질문
          </h2>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </m.div>
      </div>
    </section>
  );
}
