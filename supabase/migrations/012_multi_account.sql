-- 012: Multi-Account (계좌) 지원 (idempotent)
-- 유저당 1개 포트폴리오 제한을 제거하고, 여러 계좌(키움, 미래에셋 등)를 지원합니다.

-- 1. 유저당 1개 포트폴리오 제약 제거
DROP INDEX IF EXISTS idx_manual_portfolios_user;

-- 2. 계좌 메타데이터 컬럼 추가
ALTER TABLE manual_portfolios ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '기본 계좌';
ALTER TABLE manual_portfolios ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- 3. 비고유 인덱스 생성 (삭제된 유니크 인덱스 대체)
CREATE INDEX IF NOT EXISTS idx_manual_portfolios_user ON manual_portfolios(user_id);

-- 4. executions에 portfolio_id 추가 (ON DELETE RESTRICT: 실행 기록이 있는 계좌 삭제 방지)
ALTER TABLE executions ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES manual_portfolios(id) ON DELETE RESTRICT;

-- 5. 기존 executions에 portfolio_id 백필
UPDATE executions e
SET portfolio_id = mp.id
FROM manual_portfolios mp
WHERE e.user_id = mp.user_id
  AND e.portfolio_id IS NULL;

-- 6. 활성 세션 제약 변경: 유저 단위 → 계좌 단위
DROP INDEX IF EXISTS idx_executions_active_session;
CREATE UNIQUE INDEX IF NOT EXISTS idx_executions_active_session
  ON executions (portfolio_id) WHERE status = 'in_progress';

-- 7. complete_rebalance_session RPC 전면 재작성 (레거시 폴백 포함)
CREATE OR REPLACE FUNCTION complete_rebalance_session(
  p_execution_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_orders jsonb;
  v_total integer;
  v_executed integer;
  v_status text;
  v_portfolio_id uuid;
  v_net_cash_change numeric := 0;
  v_elem jsonb;
  v_exec_qty integer;
  v_side text;
  v_stock_code text;
  v_stock_name text;
  v_estimated_price numeric;
  v_affected integer;
BEGIN
  SELECT user_id, orders, portfolio_id INTO v_user_id, v_orders, v_portfolio_id
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 레거시 폴백: portfolio_id가 NULL인 경우 (마이그레이션 이전 세션)
  IF v_portfolio_id IS NULL THEN
    SELECT id INTO v_portfolio_id
    FROM manual_portfolios
    WHERE user_id = v_user_id
    ORDER BY display_order ASC
    LIMIT 1;
  END IF;

  -- 체결된 주문 수 계산 (하위호환: executed_quantity 또는 executed 플래그)
  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_orders);
  SELECT count(*) INTO v_executed
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE COALESCE(
    (elem->>'executed_quantity')::integer,
    CASE WHEN (elem->>'executed')::boolean = true THEN (elem->>'quantity')::integer ELSE 0 END
  ) > 0;

  IF v_executed >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'partial';
  END IF;

  -- 포트폴리오 업데이트 (포트폴리오가 존재할 때만)
  IF v_portfolio_id IS NOT NULL THEN
    FOR v_elem IN SELECT elem FROM jsonb_array_elements(v_orders) AS elem
    LOOP
      v_exec_qty := COALESCE(
        (v_elem->>'executed_quantity')::integer,
        CASE WHEN (v_elem->>'executed')::boolean = true THEN (v_elem->>'quantity')::integer ELSE 0 END
      );

      IF v_exec_qty > 0 THEN
        v_side := v_elem->>'side';
        v_stock_code := v_elem->>'stock_code';
        v_stock_name := v_elem->>'stock_name';
        v_estimated_price := (v_elem->>'estimated_price')::numeric;

        IF v_side = 'sell' THEN
          UPDATE manual_stocks
          SET quantity = quantity - v_exec_qty, updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;
          v_net_cash_change := v_net_cash_change + (v_exec_qty * v_estimated_price);
        ELSIF v_side = 'buy' THEN
          UPDATE manual_stocks
          SET quantity = quantity + v_exec_qty, updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;
          GET DIAGNOSTICS v_affected = ROW_COUNT;
          IF v_affected = 0 THEN
            INSERT INTO manual_stocks (
              portfolio_id, stock_code, stock_name, quantity,
              avg_price, current_price, currency, target_pct
            ) VALUES (
              v_portfolio_id, v_stock_code, v_stock_name, v_exec_qty,
              v_estimated_price, v_estimated_price, 'KRW', 0
            );
          END IF;
          v_net_cash_change := v_net_cash_change - (v_exec_qty * v_estimated_price);
        END IF;
      END IF;
    END LOOP;

    UPDATE manual_portfolios
    SET cash = cash + v_net_cash_change, updated_at = now()
    WHERE id = v_portfolio_id;
  END IF;

  UPDATE executions
  SET status = v_status,
      completed_at = now(),
      success_count = v_executed,
      fail_count = v_total - v_executed
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
