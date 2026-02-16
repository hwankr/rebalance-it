-- 013_actual_price.sql
-- 실제 체결가 추적, 현금 계산 버그 수정, 재계산 지원 추가
--
-- 주요 변경사항:
-- 1. update_execution_order: actual_price 파라미터 추가
-- 2. toggle_execution_order: 최신 시그니처 사용하도록 재생성
-- 3. complete_rebalance_session: actual_price + exchange_rate 기반 현금 계산 수정
-- 4. recalculate_session_orders: 새 RPC 추가 (세션 주문 원자적 재계산)

-- ============================================================
-- 1. update_execution_order 업데이트 (actual_price 파라미터 추가)
-- ============================================================

CREATE OR REPLACE FUNCTION update_execution_order(
  p_execution_id uuid,
  p_stock_code text,
  p_executed_quantity integer,
  p_actual_price numeric DEFAULT NULL
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

  -- NOTE: executed_quantity > quantity 검증 제거
  -- 클라이언트 측 clamp로 충분하며, 재계산 시 executed_quantity > 새 quantity 상황 발생 가능
  IF p_executed_quantity < 0 THEN
    RAISE EXCEPTION 'executed_quantity must be >= 0';
  END IF;

  -- JSONB 배열 요소 원자적 업데이트 (actual_price 선택적 추가)
  UPDATE executions
  SET orders = (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'stock_code' = p_stock_code
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

-- ============================================================
-- 2. toggle_execution_order 재생성 (하위 호환성 유지)
-- ============================================================

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
  -- 기존 orders 조회
  SELECT orders INTO v_orders FROM executions WHERE id = p_execution_id;

  -- 해당 종목의 quantity 추출
  SELECT (elem->>'quantity')::integer INTO v_order_qty
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE elem->>'stock_code' = p_stock_code LIMIT 1;

  -- 체크박스 상태에 따라 executed_quantity 설정
  v_exec_qty := CASE WHEN p_executed THEN COALESCE(v_order_qty, 0) ELSE 0 END;

  -- update_execution_order 호출 (actual_price는 NULL로 전달)
  RETURN update_execution_order(p_execution_id, p_stock_code, v_exec_qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. complete_rebalance_session 업데이트 (actual_price + exchange_rate 기반 현금 계산)
-- ============================================================

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
  v_price numeric;
  v_currency text;
  v_exchange_rate numeric := 1;
  v_snapshot jsonb;
  v_affected integer;
  v_existing_qty integer;
  v_existing_avg numeric;
BEGIN
  -- Execution 세션 조회 및 검증
  SELECT user_id, orders, portfolio_id, portfolio_snapshot
  INTO v_user_id, v_orders, v_portfolio_id, v_snapshot
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Legacy 지원: portfolio_id가 NULL인 경우 첫 번째 포트폴리오 사용
  IF v_portfolio_id IS NULL THEN
    SELECT id INTO v_portfolio_id
    FROM manual_portfolios
    WHERE user_id = v_user_id
    ORDER BY display_order ASC LIMIT 1;
  END IF;

  -- 환율 정보 (USD 종목 현금 계산용)
  v_exchange_rate := COALESCE((v_snapshot->>'exchange_rate')::numeric, 1);

  -- 실행된 주문 카운트
  SELECT count(*) INTO v_total FROM jsonb_array_elements(v_orders);
  SELECT count(*) INTO v_executed
  FROM jsonb_array_elements(v_orders) AS elem
  WHERE COALESCE(
    (elem->>'executed_quantity')::integer,
    CASE WHEN (elem->>'executed')::boolean = true THEN (elem->>'quantity')::integer ELSE 0 END
  ) > 0;

  -- 상태 결정
  IF v_executed >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'partial';
  END IF;

  -- 포트폴리오 업데이트
  IF v_portfolio_id IS NOT NULL THEN
    FOR v_elem IN SELECT elem FROM jsonb_array_elements(v_orders) AS elem
    LOOP
      -- 실제 체결 수량 추출
      v_exec_qty := COALESCE(
        (v_elem->>'executed_quantity')::integer,
        CASE WHEN (v_elem->>'executed')::boolean = true THEN (v_elem->>'quantity')::integer ELSE 0 END
      );

      IF v_exec_qty > 0 THEN
        v_side := v_elem->>'side';
        v_stock_code := v_elem->>'stock_code';
        v_stock_name := v_elem->>'stock_name';

        -- 실제 체결가 우선, 없으면 예상가 사용
        v_price := COALESCE(
          (v_elem->>'actual_price')::numeric,
          (v_elem->>'estimated_price')::numeric
        );

        -- 통화 정보 (주문 JSONB에서 추출 또는 KRW 기본값)
        v_currency := COALESCE(v_elem->>'currency', 'KRW');

        IF v_side = 'sell' THEN
          -- 매도: 수량 감소
          UPDATE manual_stocks
          SET quantity = quantity - v_exec_qty, updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          -- 현금 증가: USD 종목은 환율 적용
          IF v_currency = 'USD' THEN
            v_net_cash_change := v_net_cash_change + (v_exec_qty * v_price * v_exchange_rate);
          ELSE
            v_net_cash_change := v_net_cash_change + (v_exec_qty * v_price);
          END IF;

        ELSIF v_side = 'buy' THEN
          -- 기존 종목 정보 조회 (평균단가 계산용)
          SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
          FROM manual_stocks
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          -- 매수: 수량 증가 + 평균단가 업데이트
          UPDATE manual_stocks
          SET quantity = quantity + v_exec_qty,
              -- actual_price가 있으면 가중평균 계산
              avg_price = CASE
                WHEN (v_elem->>'actual_price') IS NOT NULL AND v_existing_qty > 0
                THEN ((v_existing_avg * v_existing_qty) + (v_price * v_exec_qty))
                     / (v_existing_qty + v_exec_qty)
                WHEN (v_elem->>'actual_price') IS NOT NULL
                THEN v_price
                ELSE avg_price
              END,
              updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          GET DIAGNOSTICS v_affected = ROW_COUNT;

          -- 신규 종목인 경우 INSERT
          IF v_affected = 0 THEN
            INSERT INTO manual_stocks (
              portfolio_id, stock_code, stock_name, quantity,
              avg_price, current_price, currency, target_pct
            ) VALUES (
              v_portfolio_id, v_stock_code, v_stock_name, v_exec_qty,
              v_price, v_price, v_currency, 0
            );
          END IF;

          -- 현금 감소: USD 종목은 환율 적용
          IF v_currency = 'USD' THEN
            v_net_cash_change := v_net_cash_change - (v_exec_qty * v_price * v_exchange_rate);
          ELSE
            v_net_cash_change := v_net_cash_change - (v_exec_qty * v_price);
          END IF;
        END IF;
      END IF;
    END LOOP;

    -- 포트폴리오 현금 업데이트
    UPDATE manual_portfolios
    SET cash = cash + v_net_cash_change, updated_at = now()
    WHERE id = v_portfolio_id;
  END IF;

  -- Execution 세션 상태 업데이트
  UPDATE executions
  SET status = v_status,
      completed_at = now(),
      success_count = v_executed,
      fail_count = v_total - v_executed
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. recalculate_session_orders RPC 추가 (세션 주문 원자적 재계산)
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_session_orders(
  p_execution_id uuid,
  p_new_orders jsonb,
  p_total_buy_amount numeric,
  p_total_sell_amount numeric,
  p_net_cash_change numeric,
  p_recalculated_prices jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  -- Execution 세션 조회 및 검증
  SELECT user_id INTO v_user_id
  FROM executions
  WHERE id = p_execution_id AND status = 'in_progress';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found or not in progress';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 현재 재계산 횟수 조회
  SELECT COALESCE((portfolio_snapshot->>'recalculation_count')::integer, 0)
  INTO v_count FROM executions WHERE id = p_execution_id;

  -- Orders 및 메타데이터 원자적 업데이트
  UPDATE executions
  SET orders = p_new_orders,
      total_buy_amount = p_total_buy_amount,
      total_sell_amount = p_total_sell_amount,
      net_cash_change = p_net_cash_change,
      portfolio_snapshot = portfolio_snapshot || jsonb_build_object(
        'recalculated_at', now()::text,
        'recalculation_count', v_count + 1,
        'recalculated_prices', p_recalculated_prices
      )
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 마이그레이션 완료
-- ============================================================
