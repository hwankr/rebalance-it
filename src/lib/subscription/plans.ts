export type PlanTier = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxSimulationHistory: 10,
    maxPortfolios: 1,
    allowExport: false,
    allowAdvancedAnalytics: false,
  },
  pro: {
    maxSimulationHistory: Infinity,
    maxPortfolios: 5,
    allowExport: true,
    allowAdvancedAnalytics: true,
  },
} as const;

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
};
