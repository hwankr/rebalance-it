export type PlanTier = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxSimulationHistory: 10,
    maxPortfolios: 1,
    allowKiwoomImport: false,
    allowExport: false,
    allowAdvancedAnalytics: false,
  },
  pro: {
    maxSimulationHistory: Infinity,
    maxPortfolios: 5,
    allowKiwoomImport: true,
    allowExport: true,
    allowAdvancedAnalytics: true,
  },
} as const;

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
};
