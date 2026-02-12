-- profiles 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  strategy text NOT NULL CHECK (strategy IN ('threshold', 'calendar', 'hybrid')),
  threshold_pct numeric NOT NULL DEFAULT 20,
  calendar_interval text CHECK (calendar_interval IN ('monthly', 'quarterly', 'yearly')),
  targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- executions 테이블
CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text,
  profile_name text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('completed', 'partial', 'failed')),
  total_orders integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  total_buy_amount numeric NOT NULL DEFAULT 0,
  total_sell_amount numeric NOT NULL DEFAULT 0,
  net_cash_change numeric NOT NULL DEFAULT 0,
  orders jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- settings 테이블
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_executions_executed_at ON executions (executed_at DESC);
CREATE INDEX idx_profiles_created_at ON profiles (created_at DESC);
CREATE INDEX idx_settings_key ON settings (key);
