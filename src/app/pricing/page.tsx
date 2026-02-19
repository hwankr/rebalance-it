"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, ArrowLeft, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

// ─── Pricing data ────────────────────────────────────────────────────────────

const MONTHLY_PLUS = 12900;
const ANNUAL_PLUS_TOTAL = 119000;
const MONTHLY_PRO = 19900;
const ANNUAL_PRO_TOTAL = 189000;

function fmt(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

// ─── Feature comparison table ─────────────────────────────────────────────────

interface FeatureRow {
  name: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
}

const FEATURES: FeatureRow[] = [
  {
    name: "리밸런싱 시뮬레이션",
    free: "무제한",
    plus: "무제한",
    pro: "무제한",
  },
  {
    name: "포트폴리오 수",
    free: "1개",
    plus: "5개",
    pro: "10개",
  },
  {
    name: "실행 내역",
    free: "최근 10건",
    plus: "무제한",
    pro: "무제한",
  },
  {
    name: "일괄 가격 새로고침",
    free: false,
    plus: true,
    pro: true,
  },
  {
    name: "데이터 내보내기 (CSV)",
    free: false,
    plus: true,
    pro: true,
  },
  {
    name: "고급 분석 대시보드",
    free: false,
    plus: true,
    pro: true,
  },
  {
    name: "커스텀 리밸런싱 전략",
    free: false,
    plus: false,
    pro: true,
  },
  {
    name: "AI 텍스트 파싱",
    free: "3회/일",
    plus: "30회/일",
    pro: "무제한",
  },
  {
    name: "AI 이미지 파싱",
    free: false,
    plus: "5회/일",
    pro: "무제한",
  },
  {
    name: "AI 종목 검색",
    free: "5회/일",
    plus: "50회/일",
    pro: "무제한",
  },
  {
    name: "AI 종목 요약",
    free: false,
    plus: "10회/일",
    pro: "무제한",
  },
  {
    name: "AI 세션 리포트",
    free: false,
    plus: "5회/일",
    pro: "무제한",
  },
  {
    name: "우선 지원",
    free: false,
    plus: false,
    pro: "24시간 내 응답",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm">{value}</span>;
  }
  if (value) {
    return <Check className="mx-auto size-4 text-green-600 dark:text-green-400" />;
  }
  return <X className="mx-auto size-4 text-muted-foreground/40" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { plan, isLoading } = useSubscription();
  const [yearly, setYearly] = useState(false);

  const isCurrentFree = !isLoading && plan === "free";
  const isCurrentPlus = !isLoading && plan === "plus";
  const isCurrentPro = !isLoading && plan === "pro";

  const plusMonthlyPrice = yearly
    ? Math.round(ANNUAL_PLUS_TOTAL / 12)
    : MONTHLY_PLUS;
  const proMonthlyPrice = yearly
    ? Math.round(ANNUAL_PRO_TOTAL / 12)
    : MONTHLY_PRO;

  const plusSavings = Math.round(
    ((MONTHLY_PLUS * 12 - ANNUAL_PLUS_TOTAL) / (MONTHLY_PLUS * 12)) * 100,
  );
  const proSavings = Math.round(
    ((MONTHLY_PRO * 12 - ANNUAL_PRO_TOTAL) / (MONTHLY_PRO * 12)) * 100,
  );

  function handleSubscribe(tier: "plus" | "pro") {
    toast.info("결제 기능은 준비 중입니다.", {
      description: `${tier === "plus" ? "Plus" : "Pro"} 플랜은 빠른 시일 내에 오픈할 예정입니다.`,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/portfolio">
              <ArrowLeft className="size-4" />
              돌아가기
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            요금제
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            필요에 맞는 플랜을 선택하세요.
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            월간
          </span>
          <Switch
            checked={yearly}
            onCheckedChange={setYearly}
            aria-label="연간 결제로 전환"
          />
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            연간
          </span>
          {yearly && (
            <Badge variant="success" className="text-xs">
              최대 23% 할인
            </Badge>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* ── Free ── */}
          <Card className="relative flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Free</CardTitle>
              <CardDescription>리밸런싱 시작하기</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">0원</span>
                <span className="ml-1 text-sm text-muted-foreground">/ 월</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {[
                  "리밸런싱 시뮬레이션 무제한",
                  "포트폴리오 1개",
                  "실행 내역 최근 10건",
                  "AI 텍스트 파싱 3회/일",
                  "AI 종목 검색 5회/일",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentFree ? (
                <Button variant="outline" className="w-full" disabled>
                  현재 플랜
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/portfolio">무료로 시작</Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* ── Plus (recommended) ── */}
          <Card className="relative flex flex-col border-2 border-emerald-500/60 bg-emerald-500/5 shadow-lg dark:border-emerald-400/40 dark:bg-emerald-950/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                <Sparkles className="size-3" />
                추천
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />
                Plus
              </CardTitle>
              <CardDescription>제대로 관리하기</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">
                  {fmt(plusMonthlyPrice)}원
                </span>
                <span className="ml-1 text-sm text-muted-foreground">/ 월</span>
                {yearly && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    연 {fmt(ANNUAL_PLUS_TOTAL)}원 청구
                    <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      ({plusSavings}% 절약)
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {[
                  "Free의 모든 기능",
                  "다중 포트폴리오 (5개)",
                  "무제한 실행 내역",
                  "일괄 가격 새로고침",
                  "데이터 내보내기 (CSV)",
                  "고급 분석 대시보드",
                  "AI 종목 요약 10회/일",
                  "AI 이미지 파싱 5회/일",
                  "AI 종목 검색 50회/일",
                  "AI 세션 리포트 5회/일",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentPlus ? (
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled
                >
                  현재 플랜
                </Button>
              ) : (
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => handleSubscribe("plus")}
                >
                  Plus 시작하기
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* ── Pro ── */}
          <Card className="relative flex flex-col border-2 border-blue-500/60 bg-blue-500/5 shadow-md dark:border-blue-400/40 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Crown className="size-5 text-blue-600 dark:text-blue-400" />
                Pro
              </CardTitle>
              <CardDescription>AI와 프리미엄으로 완성하기</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">
                  {fmt(proMonthlyPrice)}원
                </span>
                <span className="ml-1 text-sm text-muted-foreground">/ 월</span>
                {yearly && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    연 {fmt(ANNUAL_PRO_TOTAL)}원 청구
                    <span className="ml-1.5 font-medium text-blue-600 dark:text-blue-400">
                      ({proSavings}% 절약)
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {[
                  "Plus의 모든 기능",
                  "모든 AI 기능 무제한",
                  "포트폴리오 10개",
                  "커스텀 리밸런싱 전략",
                  "우선 지원 (24시간 내 응답)",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentPro ? (
                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled
                >
                  현재 플랜
                </Button>
              ) : (
                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handleSubscribe("pro")}
                >
                  Pro 시작하기
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="mb-6 text-center text-2xl font-bold">기능 비교</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">기능</th>
                  <th className="px-4 py-3 text-center font-medium">Free</th>
                  <th className="px-4 py-3 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      Plus
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Crown className="size-3.5 text-blue-600 dark:text-blue-400" />
                      Pro
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr
                    key={feature.name}
                    className="border-b last:border-0 odd:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{feature.name}</td>
                    <td className="px-4 py-3 text-center">
                      <FeatureValue value={feature.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureValue value={feature.plus} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureValue value={feature.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
