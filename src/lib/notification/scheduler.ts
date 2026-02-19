import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanTier } from "@/lib/subscription/plans";

/** Authorization Bearer 헤더로 CRON_SECRET 검증 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET 미설정 시 보안상 거부
  if (!cronSecret) return false;

  return token === cronSecret;
}

/** 구독 테이블에서 사용자의 플랜 티어 조회 */
export async function getUserSubscriptionPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanTier> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_tier, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return "free";

  const tier = data.plan_tier as string;
  if (tier === "plus" || tier === "pro") return tier;
  return "free";
}

/** 이번 달에 발송된 drift_alert 알림 수 조회 */
export async function getMonthlyDriftAlertCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const now = new Date();
  // 이번 달 1일 00:00:00 UTC
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("notification_type", "drift_alert")
    .in("status", ["sent", "pending"])
    .gte("created_at", monthStart.toISOString());

  return count ?? 0;
}
