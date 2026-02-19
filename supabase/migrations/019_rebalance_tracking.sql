-- 019: Add is_rebalance_tracked column to manual_stocks
-- Allows users to exclude specific stocks from rebalancing calculations
-- while preserving their target_pct values for easy re-enablement.

ALTER TABLE manual_stocks
  ADD COLUMN IF NOT EXISTS is_rebalance_tracked boolean NOT NULL DEFAULT true;
