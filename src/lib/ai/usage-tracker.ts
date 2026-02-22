import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type PlanTier } from "@/lib/subscription/plans";

export type AIFeature =
  | 'ai_summary'
  | 'ai_image_import'
  | 'ai_session_report';

const FEATURE_LIMIT_MAP: Record<AIFeature, keyof typeof PLAN_LIMITS.free> = {
  ai_summary: 'aiCallsPerDay',
  ai_image_import: 'aiImageImportPerDay',
  ai_session_report: 'aiSessionReportPerDay',
};

/**
 * AI 사용량 체크 + 증가 (원자적 DB 함수 호출)
 *
 * DB의 check_and_increment_ai_usage() PL/pgSQL 함수를
 * 호출하여 단일 트랜잭션 내에서 사용량 체크+증가를 수행합니다.
 * Race condition이 없습니다.
 */
export async function checkAndIncrementUsage(
  userId: string,
  feature: AIFeature,
  plan: PlanTier,
): Promise<{ allowed: boolean; remaining: number; dailyLimit: number }> {
  const limitKey = FEATURE_LIMIT_MAP[feature];
  const dailyLimit = PLAN_LIMITS[plan][limitKey] as number;

  if (dailyLimit === 0) {
    return { allowed: false, remaining: 0, dailyLimit: 0 };
  }

  const supabase = await createServerSupabaseClient();

  // 원자적 DB 함수 호출 (race condition 방지)
  const { data, error } = await supabase.rpc('check_and_increment_ai_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_max_count: dailyLimit,
  });

  if (error) {
    console.error('AI usage check failed:', error);
    // DB 오류 시 안전하게 차단 (fail-closed)
    return { allowed: false, remaining: 0, dailyLimit };
  }

  const allowed = data === true;

  if (!allowed) {
    return { allowed: false, remaining: 0, dailyLimit };
  }

  // 성공 - 잔여 횟수 계산을 위해 현재 카운트 조회
  const today = new Date().toISOString().split('T')[0];
  const { data: usageData } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('usage_date', today)
    .maybeSingle();

  const currentCount = usageData?.count ?? 1;
  const remaining = dailyLimit - currentCount;

  return { allowed: true, remaining: Math.max(0, remaining), dailyLimit };
}

/**
 * AI API 응답에 잔여 횟수 헤더 추가
 */
export function addUsageHeaders(
  headers: Headers,
  remaining: number,
  dailyLimit: number,
): void {
  headers.set('X-AI-Remaining', String(remaining));
  headers.set('X-AI-Daily-Limit', String(dailyLimit));
}

/**
 * AI 사용량 한도 초과 시 429 응답 생성
 */
export function createLimitExceededResponse(
  feature: AIFeature,
  dailyLimit: number,
): Response {
  // KST 기준 다음 날 자정
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstTomorrow = new Date(kstNow);
  kstTomorrow.setDate(kstTomorrow.getDate() + 1);
  kstTomorrow.setHours(0, 0, 0, 0);
  const resetAt = new Date(kstTomorrow.getTime() - kstOffset);

  return new Response(
    JSON.stringify({
      error: "일일 AI 사용 한도를 초과했습니다.",
      feature,
      daily_limit: dailyLimit,
      reset_at: resetAt.toISOString(),
      upgrade_url: "/pricing",
    }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }
  );
}
