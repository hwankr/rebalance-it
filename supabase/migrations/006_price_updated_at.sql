-- Add price_updated_at to track when auto-price refresh last ran
ALTER TABLE manual_stocks
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Add currency column to manual_stocks for multi-currency support
ALTER TABLE manual_stocks
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KRW';
