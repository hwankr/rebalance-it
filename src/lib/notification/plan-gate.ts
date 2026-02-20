import type { PlanTier } from "@/lib/subscription/plans";
import { PLAN_LIMITS } from "@/lib/subscription/plans";

// 플랜별 월간 드리프트 알림 이메일 발송 한도
const MONTHLY_EMAIL_LIMITS: Record<PlanTier, number> = {
  free: 4,
  plus: Infinity,
  pro: Infinity,
};

/** 드리프트 알림 발송 가능 여부 확인 */
export function canSendDriftAlert(plan: PlanTier, sentThisMonth: number): boolean {
  return sentThisMonth < MONTHLY_EMAIL_LIMITS[plan];
}

/** 월간 리포트 발송 가능 여부 확인 (free 플랜은 불가) */
export function canSendMonthlyReport(plan: PlanTier): boolean {
  return plan !== "free";
}

/** 플랜별 월간 이메일 한도 반환 */
export function getMonthlyEmailLimit(plan: PlanTier): number {
  return MONTHLY_EMAIL_LIMITS[plan];
}

/** 다이제스트 모드 사용 가능 여부 확인 (Plus 이상만 가능) */
export function canUseDriftDigest(plan: PlanTier): boolean {
  return PLAN_LIMITS[plan].allowDriftDigest;
}

/** 주간 뉴스 브리핑 발송 가능 여부 확인 (Plus 이상만 가능) */
export function canSendWeeklyNews(plan: PlanTier): boolean {
  return PLAN_LIMITS[plan].allowWeeklyNews;
}
