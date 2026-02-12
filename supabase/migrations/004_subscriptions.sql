-- 구독 관리 스키마 (PortOne 연동)

-- 1. subscriptions 테이블
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- PortOne 연동
  portone_billing_key text,
  portone_customer_id text,
  payment_method text,

  -- 플랜 정보
  plan_tier text NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'pro')),
  billing_cycle text
    CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- 구독 상태
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),

  -- 기간
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,

  -- 트라이얼
  trial_start timestamptz,
  trial_end timestamptz,

  -- 메타
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 유저당 활성 구독은 1개만
CREATE UNIQUE INDEX idx_subscriptions_user_active
  ON subscriptions (user_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX idx_subscriptions_status
  ON subscriptions (status);

-- updated_at 자동 갱신 (update_updated_at()는 003_manual_portfolios.sql에서 생성됨)
CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE는 service_role(Webhook)만 가능

-- 3. 결제 이벤트 테이블 (Webhook 멱등성 보장 + 감사용)
CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  portone_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_user
  ON payment_events (user_id);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
-- payment_events는 서버 전용 (사용자 직접 접근 불가)

-- 4. 프로필 수량 제한 DB Function (클라이언트 우회 방지)
CREATE OR REPLACE FUNCTION check_profile_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_allowed integer;
  user_plan text;
BEGIN
  -- 사용자의 현재 플랜 조회
  SELECT COALESCE(s.plan_tier, 'free') INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = NEW.user_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- 플랜별 제한
  IF user_plan = 'free' THEN
    max_allowed := 3;
  ELSE
    max_allowed := 999999;
  END IF;

  -- 현재 프로필 수 확인
  SELECT COUNT(*) INTO current_count
  FROM profiles WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Profile limit reached for current plan (% plan, limit: %)', user_plan, max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_profile_limit
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_profile_limit();
