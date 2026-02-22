export type PlanTier = 'free' | 'plus' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxSimulationHistory: 10,
    maxPortfolios: 1,
    allowExport: false,
    allowAdvancedAnalytics: false,
    allowBulkRefresh: false,
    allowCustomStrategy: false,
    // AI 제한
    allowAISummary: false,
    allowAIImageParse: false,
    allowAISessionReport: false,
    aiCallsPerDay: 0,
    aiImageImportPerDay: 0,
    aiSessionReportPerDay: 0,
    // 알림
    allowCalendarStrategy: false,
    allowMonthlyReport: false,
    allowDriftDigest: false,
    allowWeeklyNews: false,
    maxMonthlyEmails: 4,
    maxNotificationHistory: 10,
  },
  plus: {
    maxSimulationHistory: Infinity,
    maxPortfolios: 5,
    allowExport: true,
    allowAdvancedAnalytics: true,
    allowBulkRefresh: true,
    allowCustomStrategy: false,
    // AI 제한
    allowAISummary: true,
    allowAIImageParse: true,
    allowAISessionReport: true,
    aiCallsPerDay: 10,
    aiImageImportPerDay: 5,
    aiSessionReportPerDay: 5,
    // 알림
    allowCalendarStrategy: true,
    allowMonthlyReport: true,
    allowDriftDigest: true,
    allowWeeklyNews: true,
    maxMonthlyEmails: Infinity,
    maxNotificationHistory: 50,
  },
  pro: {
    maxSimulationHistory: Infinity,
    maxPortfolios: 10,
    allowExport: true,
    allowAdvancedAnalytics: true,
    allowBulkRefresh: true,
    allowCustomStrategy: true,
    // AI - Fair Use 상한 적용
    allowAISummary: true,
    allowAIImageParse: true,
    allowAISessionReport: true,
    aiCallsPerDay: 300,
    aiImageImportPerDay: 300,
    aiSessionReportPerDay: 300,
    // 알림
    allowCalendarStrategy: true,
    allowMonthlyReport: true,
    allowDriftDigest: true,
    allowWeeklyNews: true,
    maxMonthlyEmails: Infinity,
    maxNotificationHistory: Infinity,
  },
} as const;

// Pro의 Fair Use 상한. UI에서는 "무제한"으로 표시하되 내부적으로 300회/일 상한 적용.
export const PRO_FAIR_USE_DAILY_LIMIT = 300;

// Rate limiting (분당 호출 제한) - API 미들웨어에서 적용
export const AI_RATE_LIMITS = {
  free: { maxPerMinute: 3 },
  plus: { maxPerMinute: 10 },
  pro: { maxPerMinute: 10 },
} as const;

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};
