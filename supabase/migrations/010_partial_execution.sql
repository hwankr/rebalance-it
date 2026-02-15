-- Partial Execution & Portfolio Auto-Update
-- 1. 부분 체결 수량 지원 (executed_quantity)
-- 2. 리밸런싱 완료 시 포트폴리오 자동 업데이트

-- 1. manual_stocks quantity 제약조건 수정 (quantity=0 허용 - 전량 매도 케이스)
ALTER TABLE manual_stocks DROP CONSTRAINT IF EXISTS manual_stocks_quantity_check;
ALTER TABLE manual_stocks ADD CONSTRAINT manual_stocks_quantity_check CHECK (quantity >= 0);

-- 2. update_execution_order: 체결 수량 기반 주문 업데이트 (toggle_execution_order 대체)
CREATE OR REPLACE FUNCTION update_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed_quantity integer
) RETURNS jsonb AS $$
DECLARE
  v_orders jsonb;
  v_user_id uuid;
  v_order_qty integer;
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

  -- 주문 수량 검증
  SELECT (elem->>'quantity')::integer INTO v_order_qty
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE elem->>'stock_code' = p_stock_code
  LIMIT 1;

  IF v_order_qty IS NULL THEN
    RAISE EXCEPTION 'Order not found for stock_code: %', p_stock_code;
  END IF;

  IF p_executed_quantity < 0 OR p_executed_quantity > v_order_qty THEN
    RAISE EXCEPTION 'executed_quantity must be between 0 and %', v_order_qty;
  END IF;

  -- 원자적 JSONB 배열 요소 업데이트
  UPDATE executions
  SET orders = (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'stock_code' = p_stock_code
        THEN elem || jsonb_build_object(
          'executed_quantity', p_executed_quantity,
          'executed', p_executed_quantity > 0,
          'executed_at', CASE WHEN p_executed_quantity > 0 THEN now()::text ELSE null END
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

-- 3. toggle_execution_order 하위호환 래퍼 (기존 코드 지원)
CREATE OR REPLACE FUNCTION toggle_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed boolean
) RETURNS jsonb AS $$
DECLARE
  v_orders jsonb;
  v_order_qty integer;
  v_exec_qty integer;
BEGIN
  -- 주문 수량 조회
  SELECT orders INTO v_orders
  FROM executions
  WHERE id = p_execution_id;

  SELECT (elem->>'quantity')::integer INTO v_order_qty
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE elem->>'stock_code' = p_stock_code
  LIMIT 1;

  -- executed=true면 전체 수량, false면 0
  v_exec_qty := CASE WHEN p_executed THEN COALESCE(v_order_qty, 0) ELSE 0 END;

  RETURN update_execution_order(p_execution_id, p_stock_code, v_exec_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. complete_rebalance_session 업데이트: 포트폴리오 자동 업데이트 포함
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
  SELECT user_id, orders INTO v_user_id, v_orders
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- executed된 주문 수 계산 (하위호환: executed_quantity 없는 기존 세션 지원)
  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_orders);
  SELECT count(*) INTO v_executed
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE COALESCE(
    (elem->>'executed_quantity')::integer,
    CASE WHEN (elem->>'executed')::boolean = true THEN (elem->>'quantity')::integer ELSE 0 END
  ) > 0;

  -- 전부 체크 시 completed, 일부만 시 partial
  IF v_executed >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'partial';
  END IF;

  -- 포트폴리오 ID 조회
  SELECT id INTO v_portfolio_id
  FROM manual_portfolios
  WHERE user_id = v_user_id;

  -- 포트폴리오가 있을 때만 자산 업데이트
  IF v_portfolio_id IS NOT NULL THEN
    -- 각 주문별 포트폴리오 업데이트
    FOR v_elem IN SELECT elem FROM jsonb_array_elements(v_orders) AS elem
    LOOP
      -- 하위호환: executed_quantity 없는 기존 세션 지원
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
          -- 매도: 수량 감소
          UPDATE manual_stocks
          SET quantity = quantity - v_exec_qty,
              updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          GET DIAGNOSTICS v_affected = ROW_COUNT;
          -- 삭제된 종목은 무시 (v_affected = 0)

          v_net_cash_change := v_net_cash_change + (v_exec_qty * v_estimated_price);

        ELSIF v_side = 'buy' THEN
          -- 매수: 수량 증가 (종목이 없으면 새로 추가)
          UPDATE manual_stocks
          SET quantity = quantity + v_exec_qty,
              updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          GET DIAGNOSTICS v_affected = ROW_COUNT;

          IF v_affected = 0 THEN
            -- 포트폴리오에 없는 종목: 새로 추가
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

    -- 예수금 업데이트
    UPDATE manual_portfolios
    SET cash = cash + v_net_cash_change,
        updated_at = now()
    WHERE id = v_portfolio_id;
  END IF;

  -- 실행 기록 업데이트
  UPDATE executions
  SET status = v_status,
      completed_at = now(),
      success_count = v_executed,
      fail_count = v_total - v_executed
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
