"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { m } from "framer-motion";
import { BarChart3, Target, RefreshCw } from "lucide-react";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden bg-muted/30">
      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {/* Hero */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Rebalance-it
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            스마트한 포트폴리오 리밸런싱
          </p>
        </m.div>

        {/* CTA Buttons */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left"
        >
          <div className="p-6 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold mb-2 text-lg">간편한 자산 관리</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              복잡한 엑셀 없이, 가지고 있는 계좌와 종목을 한눈에 파악하세요.
            </p>
          </div>
          <div className="p-6 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold mb-2 text-lg">목표 비중 리밸런싱</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              원하는 비중을 설정하면, 얼마나 사고 팔아야 할지 자동으로 계산해드립니다.
            </p>
          </div>
          <div className="p-6 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold mb-2 text-lg">프라이버시 중심</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              로그인 없이 게스트 모드로 즉시 시작할 수 있습니다. 데이터는 안전하게 보호됩니다.
            </p>
          </div>
        </m.div>
      </div>
    </div>
  );
}
