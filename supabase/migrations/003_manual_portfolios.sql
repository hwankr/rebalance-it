-- 수동 포트폴리오: 키움 API 없이 직접 자산을 입력하고 리밸런싱을 테스트하기 위한 테이블

CREATE TABLE manual_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cash numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE manual_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES manual_portfolios(id) ON DELETE CASCADE,
  stock_code text NOT NULL,
  stock_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  avg_price numeric NOT NULL CHECK (avg_price >= 0),
  current_price numeric NOT NULL CHECK (current_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 유저당 수동 포트폴리오는 1개만
CREATE UNIQUE INDEX idx_manual_portfolios_user ON manual_portfolios(user_id);
-- 포트폴리오 내 종목코드 중복 방지
CREATE UNIQUE INDEX idx_manual_stocks_unique ON manual_stocks(portfolio_id, stock_code);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_manual_portfolios_updated
  BEFORE UPDATE ON manual_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_manual_stocks_updated
  BEFORE UPDATE ON manual_stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE manual_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own manual portfolios"
  ON manual_portfolios FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own manual stocks"
  ON manual_stocks FOR ALL
  USING (portfolio_id IN (
    SELECT id FROM manual_portfolios WHERE user_id = auth.uid()
  ));
