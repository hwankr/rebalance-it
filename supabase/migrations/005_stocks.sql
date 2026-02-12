-- Enable trigram extension for Korean/English text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Stock dictionary table (KRX + NYSE/NASDAQ)
CREATE TABLE IF NOT EXISTS stocks (
  stock_code TEXT PRIMARY KEY,
  stock_name TEXT NOT NULL,
  stock_name_ko TEXT,
  market TEXT NOT NULL,         -- KOSPI, KOSDAQ, NYSE, NASDAQ
  country TEXT NOT NULL,         -- KR, US
  currency TEXT NOT NULL,        -- KRW, USD
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigram indexes for fast partial-match search on Korean and English names
CREATE INDEX IF NOT EXISTS idx_stocks_name_trgm
  ON stocks USING gin (stock_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_stocks_name_ko_trgm
  ON stocks USING gin (stock_name_ko gin_trgm_ops);

-- Index for filtering by country/market
CREATE INDEX IF NOT EXISTS idx_stocks_country
  ON stocks (country);

CREATE INDEX IF NOT EXISTS idx_stocks_active
  ON stocks (is_active) WHERE is_active = true;

-- No RLS: stock list is public read-only data
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stocks_public_read" ON stocks
  FOR SELECT TO anon, authenticated
  USING (true);
