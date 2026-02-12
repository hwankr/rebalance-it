"use client";

import type { ReactNode } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_HIERARCHY, type PlanTier } from "@/lib/subscription/plans";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";

interface PlanGateProps {
  requiredPlan: PlanTier;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PlanGate({ requiredPlan, children, fallback }: PlanGateProps) {
  const { plan, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4 rounded-xl border p-6">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-8 w-1/4 rounded bg-muted" />
      </div>
    );
  }

  if (PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requiredPlan]) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt requiredPlan={requiredPlan} />;
}
