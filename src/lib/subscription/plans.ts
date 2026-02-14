export type PlanTier = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxPresets: 3,
    maxExecutionsVisible: 10,
    maxAccounts: 1,
    allowKiwoomApi: false,
    allowAutoExecute: false,
    allowExport: false,
  },
  pro: {
    maxPresets: Infinity,
    maxExecutionsVisible: Infinity,
    maxAccounts: 1,
    allowKiwoomApi: true,
    allowAutoExecute: true,
    allowExport: true,
  },
} as const;

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
};
