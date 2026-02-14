-- 007: 포트폴리오 중심 리밸런싱 재구조화
-- 프로필 기반 → 포트폴리오 종목에 목표 비중 직접 통합
-- 계좌별 리밸런싱 설정 + 프리셋 기능

-- 1. manual_stocks에 target_pct 컬럼 추가
ALTER TABLE manual_stocks ADD COLUMN target_pct numeric NOT NULL DEFAULT 0 CHECK (target_pct >= 0 AND target_pct <= 100);

-- 2. rebalance_settings 테이블 (계좌별 리밸런싱 설정)
CREATE TABLE rebalance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_source text NOT NULL CHECK (data_source IN ('kiwoom', 'manual')),
  strategy text NOT NULL DEFAULT 'threshold' CHECK (strategy IN ('threshold', 'calendar', 'hybrid')),
  threshold_pct numeric NOT NULL DEFAULT 5,
  calendar_interval text CHECK (calendar_interval IN ('monthly', 'quarterly', 'yearly')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_rebalance_settings_user_source ON rebalance_settings(user_id, data_source);

-- 3. stock_targets 테이블 (키움 모드용 목표 비중)
CREATE TABLE stock_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code text NOT NULL,
  stock_name text NOT NULL,
  target_pct numeric NOT NULL DEFAULT 0 CHECK (target_pct >= 0 AND target_pct <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_stock_targets_unique ON stock_targets(user_id, stock_code);

-- 4. presets 테이블 (기존 프로필 대체)
CREATE TABLE presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_presets_user ON presets(user_id);

-- 5. 프리셋 적용 RPC 함수 (키움 모드 - 트랜잭션 안전)
CREATE OR REPLACE FUNCTION apply_preset_to_targets(
  p_user_id uuid,
  p_targets jsonb
) RETURNS void AS $$
BEGIN
  DELETE FROM stock_targets WHERE user_id = p_user_id;
  INSERT INTO stock_targets (user_id, stock_code, stock_name, target_pct)
  SELECT p_user_id, t->>'stock_code', t->>'stock_name', (t->>'target_pct')::numeric
  FROM jsonb_array_elements(p_targets) AS t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 프리셋 적용 RPC 함수 (수동 모드 - 트랜잭션 안전)
CREATE OR REPLACE FUNCTION apply_preset_to_manual(
  p_portfolio_id uuid,
  p_targets jsonb
) RETURNS void AS $$
BEGIN
  UPDATE manual_stocks SET target_pct = 0 WHERE portfolio_id = p_portfolio_id;
  UPDATE manual_stocks ms
  SET target_pct = (t->>'target_pct')::numeric
  FROM jsonb_array_elements(p_targets) AS t
  WHERE ms.portfolio_id = p_portfolio_id
    AND ms.stock_code = t->>'stock_code';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 기존 프로필 → 프리셋 마이그레이션
INSERT INTO presets (user_id, name, targets, created_at, updated_at)
SELECT user_id, name, targets, created_at, updated_at
FROM profiles
WHERE user_id IS NOT NULL;

-- 8. executions 테이블에 preset_name 컬럼 추가
ALTER TABLE executions ADD COLUMN preset_name text;

-- 9. RLS 정책
ALTER TABLE rebalance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rebalance settings"
  ON rebalance_settings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE stock_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stock targets"
  ON stock_targets FOR ALL USING (auth.uid() = user_id);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own presets"
  ON presets FOR ALL USING (auth.uid() = user_id);

-- 10. updated_at 트리거 (update_updated_at 함수는 003에서 이미 생성됨)
CREATE TRIGGER trg_rebalance_settings_updated
  BEFORE UPDATE ON rebalance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_stock_targets_updated
  BEFORE UPDATE ON stock_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_presets_updated
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
