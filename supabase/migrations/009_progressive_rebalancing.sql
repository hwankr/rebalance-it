-- Progressive Rebalancing (진행중인 리밸런싱)
-- 리밸런싱 세션을 시작하고, 주문별 진행 상태를 추적하며, 완료/포기할 수 있는 기능

-- 1. executions 상태 CHECK 제약조건 확장
ALTER TABLE executions DROP CONSTRAINT IF EXISTS executions_status_check;
ALTER TABLE executions ADD CONSTRAINT executions_status_check
  CHECK (status IN ('completed', 'partial', 'failed', 'in_progress', 'abandoned'));

-- 2. UPDATE RLS 정책 추가 (기존에 누락됨)
DROP POLICY IF EXISTS "Users can update own executions" ON executions;
CREATE POLICY "Users can update own executions"
  ON executions FOR UPDATE USING (auth.uid() = user_id);

-- 3. 세션 추적용 컬럼 추가
ALTER TABLE executions ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE executions ADD COLUMN IF NOT EXISTS portfolio_snapshot jsonb;

-- 4. 사용자당 1개의 진행중 세션만 허용 (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_executions_active_session
  ON executions (user_id) WHERE status = 'in_progress';

-- 5. 주문 토글 RPC 함수 (원자적 JSONB 업데이트)
CREATE OR REPLACE FUNCTION toggle_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed boolean
) RETURNS jsonb AS $$
DECLARE
  v_orders jsonb;
  v_user_id uuid;
BEGIN
  -- 사용자 검증
  SELECT user_id, orders INTO v_user_id, v_orders
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 원자적 JSONB 배열 요소 업데이트
  UPDATE executions
  SET orders = (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'stock_code' = p_stock_code
        THEN elem || jsonb_build_object(
          'executed', p_executed,
          'executed_at', CASE WHEN p_executed THEN now()::text ELSE null END
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(orders) AS elem
  )
  WHERE id = p_execution_id;

  -- 업데이트된 주문 반환
  SELECT orders INTO v_orders FROM executions WHERE id = p_execution_id;
  RETURN v_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 세션 완료 RPC 함수
CREATE OR REPLACE FUNCTION complete_rebalance_session(
  p_execution_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_orders jsonb;
  v_total integer;
  v_executed integer;
  v_status text;
BEGIN
  SELECT user_id, orders INTO v_user_id, v_orders
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- executed된 주문 수 계산
  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_orders);
  SELECT count(*) INTO v_executed
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE (elem->>'executed')::boolean = true;

  -- 전부 체크 시 completed, 일부만 시 partial
  IF v_executed >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'partial';
  END IF;

  UPDATE executions
  SET status = v_status,
      completed_at = now(),
      success_count = v_executed,
      fail_count = v_total - v_executed
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 세션 포기 RPC 함수
CREATE OR REPLACE FUNCTION abandon_rebalance_session(
  p_execution_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_orders jsonb;
  v_executed integer;
  v_total integer;
BEGIN
  SELECT user_id, orders INTO v_user_id, v_orders
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_orders);
  SELECT count(*) INTO v_executed
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE (elem->>'executed')::boolean = true;

  UPDATE executions
  SET status = 'abandoned',
      completed_at = now(),
      success_count = v_executed,
      fail_count = v_total - v_executed
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
