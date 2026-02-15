"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { m } from "framer-motion";
import { BarChart3, Target, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart3,
    title: "포트폴리오 관리",
    description: "보유 종목과 비중을 한눈에 확인하세요.",
  },
  {
    icon: Target,
    title: "목표 비중 설정",
    description: "원하는 자산 배분 비율을 설정하세요.",
  },
  {
    icon: RefreshCw,
    title: "리밸런싱 시뮬레이션",
    description: "최적의 매수/매도 주문을 자동으로 계산합니다.",
  },
  {
    icon: Shield,
    title: "프리셋 저장",
    description: "자주 사용하는 목표 비중을 프리셋으로 저장하세요.",
  },
];

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden bg-mesh">
      {/* Animated floating orbs */}
      <div className="orb w-72 h-72 bg-[var(--gradient-start)] opacity-30 top-[10%] left-[15%]" />
      <div
        className="orb w-96 h-96 bg-[var(--gradient-end)] opacity-20 top-[50%] right-[10%]"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="orb w-64 h-64 opacity-25 bottom-[10%] left-[40%]"
        style={{ animationDelay: "4s", background: "oklch(0.60 0.20 300)" }}
      />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 bg-dot-grid opacity-30" />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {/* Hero */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gradient">
            Rebalance-it
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            스마트한 포트폴리오 리밸런싱
          </p>
        </m.div>

        {/* CTA Buttons */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            variant="gradient"
            size="lg"
            className="w-full sm:w-auto text-base px-8"
            onClick={() => {
              enterGuestMode();
              router.push("/portfolio");
            }}
          >
            비회원으로 시작
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-base px-8"
            asChild
          >
            <Link href="/login">로그인 / 회원가입</Link>
          </Button>
        </m.div>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          비회원 모드에서는 데이터가 브라우저에만 저장됩니다.
        </m.p>

        {/* Feature Highlights */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
        >
          {features.map((feature, i) => (
            <m.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              className="glass-card rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <feature.icon className="size-5 text-primary" />
                <span className="font-semibold">{feature.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </m.div>
          ))}
        </m.div>
      </div>
    </div>
  );
}
