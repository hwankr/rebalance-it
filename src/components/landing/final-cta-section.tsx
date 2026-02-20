"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { fadeInUp } from "./animation-config";
import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  onGuestStart: () => void;
}

export function FinalCtaSection({ onGuestStart }: FinalCtaSectionProps) {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 bg-primary/[0.03]" />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-full transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-20rem)] aspect-[1155/678] w-[50rem] -translate-x-1/2 bg-gradient-to-tr from-primary/20 to-primary/5 opacity-30 dark:opacity-10" />
      </div>

      <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
        <m.div {...fadeInUp} className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            지금 바로 시작하세요
          </h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            회원가입 없이 바로 사용할 수 있습니다.
            <br className="hidden sm:block" />
            스마트한 포트폴리오 관리를 경험해보세요.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button
              variant="gradient"
              size="lg"
              className="w-full text-base px-8 sm:w-auto"
              onClick={onGuestStart}
            >
              무료로 시작하기
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base px-8 sm:w-auto"
              asChild
            >
              <Link href="/login">로그인 / 회원가입</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            비회원 모드에서는 데이터가 브라우저에만 저장됩니다.
          </p>
        </m.div>
      </div>
    </section>
  );
}
