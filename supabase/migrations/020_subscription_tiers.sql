-- ============================================================
-- 020_subscription_tiers.sql
-- 구독 3-Tier 확장 (Free / Plus / Pro) + AI 사용량 추적
-- ============================================================

-- =============================================
-- 1. plan_tier CHECK 제약조건 변경
-- =============================================

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_tier_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_tier_check
  CHECK (plan_tier IN ('free', 'plus', 'pro'));

-- =============================================
-- 2. ai_usage 테이블 생성 (AI 일일 사용량 추적)
-- =============================================

CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL
    CHECK (feature IN (
      'ai_summary',
      'ai_text_import',
      'ai_image_import',
      'ai_search',
      'ai_session_report'
    )),
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 유저+기능+날짜 복합 유니크 (UPSERT / 원자적 함수용)
  UNIQUE (user_id, feature, usage_date)
);

-- 인덱스
CREATE INDEX idx_ai_usage_user_date
  ON ai_usage (user_id, usage_date);

-- updated_at 자동 갱신
CREATE TRIGGER trg_ai_usage_updated
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 사용량만 조회 가능
CREATE POLICY "Users can view own ai_usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE는 service_role(서버)만 가능
-- (클라이언트에서 직접 카운트 조작 방지)

-- =============================================
-- 3. 원자적 AI 사용량 체크+증가 함수
-- =============================================
-- 동작 방식:
-- 1. INSERT ... ON CONFLICT DO UPDATE SET count = count + 1
-- 2. WHERE count < p_max_count 조건으로 상한 초과 방지
-- 3. RETURNING으로 성공 여부 판단
-- 4. 단일 SQL문으로 실행되므로 race condition 없음

CREATE OR REPLACE FUNCTION check_and_increment_ai_usage(
  p_user_id uuid,
  p_feature text,
  p_max_count integer
) RETURNS boolean AS $$
DECLARE
  current integer;
BEGIN
  -- 단일 원자적 UPSERT + 상한 체크
  INSERT INTO ai_usage (user_id, feature, usage_date, count)
  VALUES (p_user_id, p_feature, CURRENT_DATE, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET
    count = ai_usage.count + 1,
    updated_at = now()
  WHERE ai_usage.count < p_max_count
  RETURNING count INTO current;

  -- FOUND = true이면 INSERT 또는 UPDATE가 성공한 것 (한도 내)
  -- FOUND = false이면 WHERE 조건 불일치로 UPDATE 미실행 (한도 초과)
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. 포트폴리오 제한 트리거 수정
-- =============================================
-- 기존: free=3, else=999999
-- 변경: free=1, plus=5, pro=10

CREATE OR REPLACE FUNCTION check_profile_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_allowed integer;
  user_plan text;
BEGIN
  -- 사용자의 현재 플랜 조회 (past_due도 grace period 내에서는 유효)
  SELECT COALESCE(s.plan_tier, 'free') INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = NEW.user_id
    AND s.status IN ('active', 'trialing', 'past_due')
  LIMIT 1;

  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- 3-tier 플랜별 제한 (PLAN_LIMITS와 일치)
  CASE user_plan
    WHEN 'free' THEN max_allowed := 1;
    WHEN 'plus' THEN max_allowed := 5;
    WHEN 'pro'  THEN max_allowed := 10;
    ELSE max_allowed := 1;
  END CASE;

  -- 현재 프로필 수 확인
  SELECT COUNT(*) INTO current_count
  FROM profiles WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Profile limit reached for current plan (% plan, limit: %)', user_plan, max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거는 기존 것이 함수를 참조하므로 재생성 불필요

-- =============================================
-- 5. 오래된 ai_usage 데이터 정리 함수
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_ai_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron 스케줄링 (Supabase에서 pg_cron 사용 가능한 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-ai-usage',
      '0 15 * * *',
      'SELECT cleanup_old_ai_usage()'
    );
  END IF;
END $$;
