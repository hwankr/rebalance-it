import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type PlanTier, PLAN_HIERARCHY } from "./plans";

const GRACE_PERIOD_DAYS = 3;

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
 * 사용자의 유효 플랜 조회 (grace period 포함)
 *
 * past_due 상태인 경우 current_period_end + 3일 이내이면 유료 플랜 유지,
 * 초과 시 free로 강등합니다. requirePlan()과 free-tier AI 라우트 모두
 * 이 함수를 통해 일관된 플랜 해석을 받습니다.
 */
export async function resolvePlanTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanTier> {
  if (process.env.NODE_ENV === "development") {
    return "pro";
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_tier, status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle();

  if (!sub) return "free";

  // past_due인 경우 grace period 체크 (current_period_end + N일)
  if (sub.status === "past_due" && sub.current_period_end) {
    const graceDeadline = new Date(sub.current_period_end);
    graceDeadline.setDate(graceDeadline.getDate() + GRACE_PERIOD_DAYS);
    if (new Date() > graceDeadline) {
      return "free";
    }
  }

  return (sub.plan_tier as PlanTier) ?? "free";
}

/**
 * API 라우트 구독 가드 - 최소 플랜 이상인지 확인
 * requireAuth()를 내부적으로 호출하므로 별도 인증 체크 불필요
 */
export async function requirePlan(minimumPlan: PlanTier) {
  const { user, supabase } = await requireAuth();

  const currentPlan = await resolvePlanTier(supabase, user.id);
  const planLabel = minimumPlan === "plus" ? "Plus" : "Pro";

  if (PLAN_HIERARCHY[currentPlan] < PLAN_HIERARCHY[minimumPlan]) {
    throw new Response(
      JSON.stringify({
        error: `${planLabel} 플랜 이상 구독이 필요합니다.`,
        required_plan: minimumPlan,
        current_plan: currentPlan,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { user, supabase, plan: currentPlan };
}
