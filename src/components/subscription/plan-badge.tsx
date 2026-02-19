"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

export function PlanBadge() {
  const { plan, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <span className="inline-block h-5 w-12 animate-pulse rounded-full bg-muted" />
    );
  }

  if (plan === "pro") {
    return (
      <Link href="/pricing">
        <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-700">
          <Sparkles className="size-3" />
          Pro
        </Badge>
      </Link>
    );
  }

  if (plan === "plus") {
    return (
      <Link href="/pricing">
        <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700">
          <Sparkles className="size-3" />
          Plus
        </Badge>
      </Link>
    );
  }

  return (
    <Link href="/pricing">
      <Badge variant="secondary">Free</Badge>
    </Link>
  );
}
