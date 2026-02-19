export type PlanTier = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxSimulationHistory: 10,
    maxPortfolios: 1,
    allowExport: false,
    allowAdvancedAnalytics: false,
    allowAISummary: false,
    aiCallsPerDay: 0,
    aiTextImportPerDay: 5,
    aiSearchPerDay: 10,
  },
  pro: {
    maxSimulationHistory: Infinity,
    maxPortfolios: 5,
    allowExport: true,
    allowAdvancedAnalytics: true,
    allowAISummary: true,
    aiCallsPerDay: 30,
    aiTextImportPerDay: 50,
    aiSearchPerDay: 100,
  },
} as const;

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
};
