"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGuestMode } from "@/contexts/guest-mode-context";
import type { PlanTier } from "@/lib/subscription/plans";

interface SubscriptionData {
  plan_tier: PlanTier;
  status?: string;
  current_period_end?: string;
  billing_cycle?: string;
}

const DEV_PLAN_KEY = "dev-plan-override";

function getDevOverride(): PlanTier | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(DEV_PLAN_KEY);
  if (val === "pro" || val === "free") return val;
  return null;
}

const listeners = new Set<() => void>();
function subscribeDevOverride(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setDevPlanOverride(plan: PlanTier | null) {
  if (plan === null) {
    localStorage.removeItem(DEV_PLAN_KEY);
  } else {
    localStorage.setItem(DEV_PLAN_KEY, plan);
  }
  listeners.forEach((cb) => cb());
}

export function useSubscription() {
  const { user } = useAuth();
  const { isGuest } = useGuestMode();

  const devOverride = useSyncExternalStore(
    subscribeDevOverride,
    () => getDevOverride(),
    () => null,
  );

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user && !isGuest,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubscriptionData> => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        return { plan_tier: "free" };
      }
      return res.json();
    },
  });

  const realPlan: PlanTier = isGuest ? "free" : (subscription?.plan_tier ?? "free");
  const plan: PlanTier = devOverride ?? realPlan;
  const isPro = plan === "pro";
  const isDevOverride = devOverride !== null;

  return { plan, isPro, isLoading: isGuest ? false : isLoading, subscription, refetch, isDevOverride, realPlan };
}
