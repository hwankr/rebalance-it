-- 011: 포트폴리오에 활성 프리셋 연결
-- 계좌당 하나의 리밸런싱 전략(프리셋)을 연결합니다.

-- 1. manual_portfolios에 active_preset_id 컬럼 추가
ALTER TABLE manual_portfolios ADD COLUMN active_preset_id uuid REFERENCES presets(id) ON DELETE SET NULL;

-- 2. apply_preset_to_manual RPC 확장 (원자적: 타겟 적용 + 프리셋 링크)
CREATE OR REPLACE FUNCTION apply_preset_to_manual(
  p_portfolio_id uuid,
  p_targets jsonb,
  p_preset_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE manual_stocks SET target_pct = 0 WHERE portfolio_id = p_portfolio_id;
  UPDATE manual_stocks ms
  SET target_pct = (t->>'target_pct')::numeric
  FROM jsonb_array_elements(p_targets) AS t
  WHERE ms.portfolio_id = p_portfolio_id
    AND ms.stock_code = t->>'stock_code';
  UPDATE manual_portfolios SET active_preset_id = p_preset_id WHERE id = p_portfolio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
