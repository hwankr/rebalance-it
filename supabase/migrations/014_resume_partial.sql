-- 014_resume_partial.sql
-- 부분완료된 세션을 진행중으로 되돌려 이어서 수정할 수 있게 하는 RPC

CREATE OR REPLACE FUNCTION resume_rebalance_session(
  p_execution_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_status text;
  v_existing_active integer;
BEGIN
  -- 세션 조회
  SELECT user_id, portfolio_id, status
  INTO v_user_id, v_portfolio_id, v_status
  FROM executions
  WHERE id = p_execution_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- partial 상태만 재개 가능
  IF v_status != 'partial' THEN
    RAISE EXCEPTION 'Only partial sessions can be resumed (current: %)', v_status;
  END IF;

  -- 해당 계좌에 이미 진행중인 세션이 있는지 확인
  SELECT count(*) INTO v_existing_active
  FROM executions
  WHERE portfolio_id = v_portfolio_id
    AND status = 'in_progress'
    AND id != p_execution_id;

  IF v_existing_active > 0 THEN
    RAISE EXCEPTION 'Another session is already in progress for this portfolio';
  END IF;

  -- 상태를 in_progress로 되돌림
  UPDATE executions
  SET status = 'in_progress',
      completed_at = NULL
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
