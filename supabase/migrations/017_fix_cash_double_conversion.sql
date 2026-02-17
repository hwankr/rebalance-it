-- 017_fix_cash_double_conversion.sql
-- USD 종목 현금 계산 시 환율 이중 적용 버그 수정
--
-- 문제: estimated_price와 actual_price는 이미 KRW로 정규화된 값인데,
--       USD 종목에 대해 exchange_rate를 한 번 더 곱하여 현금 변동이 ~1,450배 뻥튀기됨.
-- 수정: 모든 가격을 KRW로 간주하고 환율 추가 적용 제거.

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
        -- NOTE: estimated_price와 actual_price는 모두 KRW 정규화된 값이므로
        -- 환율 추가 적용 없이 그대로 사용한다. (USD 종목도 이미 KRW로 변환됨)
        v_price := COALESCE(
          (v_elem->>'actual_price')::numeric,
          (v_elem->>'estimated_price')::numeric
        );

        -- 통화 정보 (평균단가 계산 시 native 가격 판단에만 사용)
        v_currency := COALESCE(v_elem->>'currency', 'KRW');

        IF v_side = 'sell' THEN
          -- 매도: 수량 감소
          UPDATE manual_stocks
          SET quantity = quantity - v_exec_qty, updated_at = now()
          WHERE portfolio_id = v_portfolio_id AND stock_code = v_stock_code;

          -- 현금 증가 (가격은 이미 KRW)
          v_net_cash_change := v_net_cash_change + (v_exec_qty * v_price);

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

          -- 현금 감소 (가격은 이미 KRW)
          v_net_cash_change := v_net_cash_change - (v_exec_qty * v_price);
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
