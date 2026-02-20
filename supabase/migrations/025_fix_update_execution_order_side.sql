-- 025_fix_update_execution_order_side.sql
-- 실제 체결가 추적 및 재계산 시 같은 종목의 매수/매도 상쇄 방지
--
-- 문제: update_execution_order가 stock_code로만 매칭되어 재계산 시 
--       반대 방향 주문이 생겼을 때 두 주문이 동시에 업데이트(상쇄)되는 현상 발생.
-- 해결: p_side 파라미터 추가하여 방향(side)까지 일치하는 주문만 업데이트.

CREATE OR REPLACE FUNCTION update_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed_quantity integer,
  p_actual_price numeric DEFAULT NULL,
  p_side text DEFAULT NULL
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

  IF p_executed_quantity < 0 THEN
    RAISE EXCEPTION 'executed_quantity must be >= 0';
  END IF;

  -- JSONB 배열 요소 원자적 업데이트 (stock_code와 side 모두 일치 시 업데이트)
  UPDATE executions
  SET orders = (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'stock_code' = p_stock_code 
             AND (p_side IS NULL OR elem->>'side' = p_side)
        THEN elem || jsonb_build_object(
          'executed_quantity', p_executed_quantity,
          'executed', p_executed_quantity > 0,
          'executed_at', CASE WHEN p_executed_quantity > 0 THEN now()::text ELSE null END
        ) || CASE
          WHEN p_actual_price IS NOT NULL
          THEN jsonb_build_object(
            'actual_price', p_actual_price,
            'actual_amount', p_executed_quantity * p_actual_price
          )
          ELSE '{}'::jsonb
        END
        ELSE elem
      END
    )
    FROM jsonb_array_elements(orders) AS elem
  )
  WHERE id = p_execution_id;

  -- 업데이트된 orders 반환
  SELECT orders INTO v_orders FROM executions WHERE id = p_execution_id;
  RETURN v_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 호환성을 위해 toggle_execution_order 갱신
CREATE OR REPLACE FUNCTION toggle_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed boolean,
  p_side text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_orders jsonb;
  v_order_qty integer;
  v_exec_qty integer;
BEGIN
  -- 기존 orders 조회
  SELECT orders INTO v_orders FROM executions WHERE id = p_execution_id;

  -- 해당 종목+side 의 quantity 추출
  SELECT (elem->>'quantity')::integer INTO v_order_qty
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE elem->>'stock_code' = p_stock_code 
    AND (p_side IS NULL OR elem->>'side' = p_side) 
  LIMIT 1;

  -- 체크박스 상태에 따라 executed_quantity 설정
  v_exec_qty := CASE WHEN p_executed THEN COALESCE(v_order_qty, 0) ELSE 0 END;

  -- update_execution_order 호출 
  RETURN update_execution_order(p_execution_id, p_stock_code, v_exec_qty, NULL, p_side);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
