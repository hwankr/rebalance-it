-- Add asset_type column to distinguish stocks from ETFs
-- Default 'STOCK' ensures backward compatibility for existing ~13K rows
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS asset_type TEXT NOT NULL DEFAULT 'STOCK';

-- Constrain allowed values
ALTER TABLE stocks
  ADD CONSTRAINT chk_stocks_asset_type
  CHECK (asset_type IN ('STOCK', 'ETF'));

-- Drop existing standalone active index (will be replaced by composite)
DROP INDEX IF EXISTS idx_stocks_active;

-- Create composite partial index covering both active and asset_type filters
CREATE INDEX IF NOT EXISTS idx_stocks_active_asset_type
  ON stocks (is_active, asset_type) WHERE is_active = true;
