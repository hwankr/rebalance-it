import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type PlanTier, PLAN_HIERARCHY } from "./plans";

/**
 * API 라우트 인증 가드 - 인증된 사용자인지 확인
 */
export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(
      JSON.stringify({ error: "인증이 필요합니다." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return { user, supabase };
}

/**
 * API 라우트 구독 가드 - 최소 플랜 이상인지 확인
 * requireAuth()를 내부적으로 호출하므로 별도 인증 체크 불필요
 */
export async function requirePlan(minimumPlan: PlanTier) {
  const { user, supabase } = await requireAuth();

  // 개발 모드에서는 플랜 체크를 건너뛰고 Pro로 간주
  if (process.env.NODE_ENV === "development") {
    return { user, supabase, plan: "pro" as PlanTier };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_tier, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const currentPlan: PlanTier = (sub?.plan_tier as PlanTier) ?? "free";

  if (PLAN_HIERARCHY[currentPlan] < PLAN_HIERARCHY[minimumPlan]) {
    throw new Response(
      JSON.stringify({
        error: "Pro 플랜 이상 구독이 필요합니다.",
        required_plan: minimumPlan,
        current_plan: currentPlan,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { user, supabase, plan: currentPlan };
}
