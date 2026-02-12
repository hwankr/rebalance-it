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

const PRO_FEATURES = [
  "무제한 리밸런싱 프로필",
  "키움 API 자동 연동",
  "자동 주문 실행",
  "실행 내역 전체 조회",
  "데이터 내보내기 (CSV/Excel)",
];

interface UpgradePromptProps {
  requiredPlan?: PlanTier;
  title?: string;
  description?: string;
}

export function UpgradePrompt({
  requiredPlan: _requiredPlan = "pro",
  title = "Pro 플랜이 필요합니다",
  description = "이 기능을 사용하려면 Pro 플랜으로 업그레이드하세요.",
}: UpgradePromptProps) {
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
            <Lock className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-blue-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
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
