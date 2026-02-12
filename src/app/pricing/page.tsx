"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_LIMITS } from "@/lib/subscription/plans";

interface FeatureRow {
  name: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: FeatureRow[] = [
  {
    name: "리밸런싱 프로필",
    free: `최대 ${PLAN_LIMITS.free.maxProfiles}개`,
    pro: "무제한",
  },
  {
    name: "실행 내역 조회",
    free: `최근 ${PLAN_LIMITS.free.maxExecutionsVisible}건`,
    pro: "전체",
  },
  {
    name: "수동 포트폴리오",
    free: true,
    pro: true,
  },
  {
    name: "리밸런싱 시뮬레이션",
    free: true,
    pro: true,
  },
  {
    name: "키움 API 연동",
    free: false,
    pro: true,
  },
  {
    name: "자동 주문 실행",
    free: false,
    pro: true,
  },
  {
    name: "데이터 내보내기 (CSV/Excel)",
    free: false,
    pro: true,
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm">{value}</span>;
  }
  if (value) {
    return <Check className="size-4 text-green-600 dark:text-green-400" />;
  }
  return <X className="size-4 text-muted-foreground/50" />;
}

export default function PricingPage() {
  const { plan, isLoading } = useSubscription();

  const isCurrentFree = !isLoading && plan === "free";
  const isCurrentPro = !isLoading && plan === "pro";

  function handleSubscribe() {
    toast.info("결제 기능은 준비 중입니다.", {
      description: "빠른 시일 내에 오픈할 예정입니다.",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              돌아가기
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">요금제</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            필요에 맞는 플랜을 선택하세요.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Free Plan */}
          <Card className="relative flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Free</CardTitle>
              <CardDescription>
                기본 리밸런싱 기능을 무료로 사용하세요.
              </CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">무료</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                  리밸런싱 프로필 최대 {PLAN_LIMITS.free.maxProfiles}개
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                  실행 내역 최근 {PLAN_LIMITS.free.maxExecutionsVisible}건 조회
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                  수동 포트폴리오 관리
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                  리밸런싱 시뮬레이션
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentFree ? (
                <Button variant="outline" className="w-full" disabled>
                  현재 플랜
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/">무료로 시작하기</Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative flex flex-col border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
            <div className="absolute -top-3 right-4">
              <Badge className="gap-1 bg-blue-600 text-white">
                <Sparkles className="size-3" />
                추천
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Crown className="size-5 text-blue-600 dark:text-blue-400" />
                Pro
              </CardTitle>
              <CardDescription>
                모든 기능을 제한 없이 사용하세요.
              </CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">가격 미정</span>
                <span className="ml-1 text-sm text-muted-foreground">
                  / 월
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <strong>무제한</strong> 리밸런싱 프로필
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  실행 내역 <strong>전체</strong> 조회
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  키움 API 자동 연동
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  자동 주문 실행
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  데이터 내보내기 (CSV/Excel)
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentPro ? (
                <Button className="w-full" disabled>
                  현재 플랜
                </Button>
              ) : (
                <Button className="w-full gap-2" onClick={handleSubscribe}>
                  <Sparkles className="size-4" />
                  구독하기
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold">
            기능 비교
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">기능</th>
                  <th className="px-4 py-3 text-center font-medium">Free</th>
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
                  <tr key={feature.name} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{feature.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <FeatureValue value={feature.free} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <FeatureValue value={feature.pro} />
                      </div>
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
