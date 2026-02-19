"use client";

import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Check } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/lib/subscription/plans";

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: [],
  plus: [
    "다중 포트폴리오 관리 (5개)",
    "일괄 가격 새로고침",
    "데이터 내보내기 (CSV)",
    "AI 종목 요약 (10회/일)",
    "고급 분석 대시보드",
  ],
  pro: [
    "모든 AI 기능 무제한",
    "커스텀 리밸런싱 전략",
    "포트폴리오 10개",
    "우선 지원 (24시간 내 응답)",
  ],
};

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

const PLAN_COLORS: Record<PlanTier, { border: string; icon: string }> = {
  free: { border: "border-muted", icon: "text-muted-foreground" },
  plus: { border: "border-green-200 dark:border-green-800", icon: "text-green-600 dark:text-green-400" },
  pro: { border: "border-blue-200 dark:border-blue-800", icon: "text-blue-600 dark:text-blue-400" },
};

interface UpgradePromptProps {
  requiredPlan?: PlanTier;
  title?: string;
  description?: string;
}

export function UpgradePrompt({
  requiredPlan = "plus",
  title,
  description,
}: UpgradePromptProps) {
  const label = PLAN_LABELS[requiredPlan];
  const features = PLAN_FEATURES[requiredPlan];
  const colors = PLAN_COLORS[requiredPlan];
  const displayTitle = title ?? `${label} 플랜이 필요합니다`;
  const displayDescription = description ?? `이 기능을 사용하려면 ${label} 플랜으로 업그레이드하세요.`;

  return (
    <Card className={`border ${colors.border} bg-muted/50`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={`flex size-8 items-center justify-center rounded-full ${requiredPlan === "pro" ? "bg-blue-100 dark:bg-blue-900/50" : "bg-green-100 dark:bg-green-900/50"}`}>
            <Lock className={`size-4 ${colors.icon}`} />
          </div>
          <CardTitle className="text-base">{displayTitle}</CardTitle>
        </div>
        <CardDescription>{displayDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {features.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className={`size-4 shrink-0 ${requiredPlan === "pro" ? "text-blue-500" : "text-green-500"}`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild className="w-full gap-2">
          <Link href="/pricing">
            <Sparkles className="size-4" />
            요금제 보기
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
