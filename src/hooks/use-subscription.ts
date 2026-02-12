"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { PlanTier } from "@/lib/subscription/plans";

interface SubscriptionData {
  plan_tier: PlanTier;
  status?: string;
  current_period_end?: string;
  billing_cycle?: string;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubscriptionData> => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        return { plan_tier: "free" };
      }
      return res.json();
    },
  });

  const plan: PlanTier = subscription?.plan_tier ?? "free";
  const isPro = plan === "pro";

  return { plan, isPro, isLoading, subscription, refetch };
}
