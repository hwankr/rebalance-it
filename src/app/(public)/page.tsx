"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { m } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingHeader } from "@/components/landing/landing-header";
import { InteractiveDemoSection } from "@/components/landing/interactive-demo-section";
import { FeatureSection } from "@/components/landing/feature-section";
import { AiFeatureSection } from "@/components/landing/ai-feature-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SecuritySection } from "@/components/landing/security-section";
import { PricingPreviewSection } from "@/components/landing/pricing-preview-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroPortfolioCard } from "@/components/landing/hero-portfolio-card";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isGuest, enterGuestMode } = useGuestMode();

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      router.replace("/portfolio");
    }
  }, [user, isGuest, loading, router]);

  if (loading || user || isGuest) {
    return null;
  }

  const handleGuestStart = () => {
    enterGuestMode();
    router.push("/portfolio");
  };

  return (
    <div className="relative flex flex-col">
      {/* Header */}
      <LandingHeader onGuestStart={handleGuestStart} />

      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden pt-16">
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 -z-20 h-full w-full bg-grid-pattern"
          aria-hidden="true"
        />

        {/* Radial gradient blob */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary/30 opacity-20 dark:opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column: text content */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              {/* Badge */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                  포트폴리오 리밸런싱의 새로운 기준
                </Badge>
              </m.div>

              {/* Headline */}
              <m.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl font-bold leading-[1.15] tracking-tight text-foreground md:text-6xl md:leading-tight"
              >
                내 포트폴리오,
                <br />
                최적의 균형을 찾다
              </m.h1>

              {/* Subtitle */}
              <m.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
              >
                목표 비중을 설정하면 매매 수량을 자동으로 계산해드립니다.
                <br className="hidden sm:block" />
                복잡한 엑셀 없이 스마트하게 리밸런싱하세요.
              </m.p>

              {/* CTA Buttons */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
              >
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full text-base px-8 sm:w-auto"
                  onClick={handleGuestStart}
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
              </m.div>

              {/* Guest mode notice */}
              <m.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="mt-4 text-sm text-muted-foreground"
              >
                비회원 모드에서는 데이터가 브라우저에만 저장됩니다.
              </m.p>
            </div>

            {/* Right column: portfolio card */}
            <m.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full px-4 sm:px-8 lg:px-0"
            >
              <HeroPortfolioCard />
            </m.div>
          </div>
        </div>
      </section>

      {/* Free trial bridge */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto w-full max-w-3xl px-5 pt-12 md:px-8"
      >
        <a
          href="#demo"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-6 py-7 text-center shadow-sm transition-colors hover:bg-primary/10 dark:hover:bg-primary/15"
        >
          <p className="text-lg font-bold text-foreground">
            회원가입 없이 지금 바로 체험해보세요
          </p>
          <p className="text-sm text-muted-foreground">
            아래에서 리밸런싱을 직접 경험할 수 있습니다
          </p>
          <m.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-1 text-primary"
          >
            <ChevronDown className="size-6" />
          </m.div>
        </a>
      </m.div>

      {/* Interactive Demo */}
      <div id="demo">
        <InteractiveDemoSection />
      </div>

      {/* Core Features */}
      <FeatureSection />

      {/* AI Features */}
      <AiFeatureSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Security & Trust */}
      <SecuritySection />

      {/* Pricing Preview */}
      <PricingPreviewSection onGuestStart={handleGuestStart} />

      {/* FAQ */}
      <FaqSection />

      {/* Final CTA */}
      <FinalCtaSection onGuestStart={handleGuestStart} />
    </div>
  );
}
