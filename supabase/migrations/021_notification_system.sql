-- 021: Notification System (Email-only)
-- notification_preferences: 사용자별 알림 설정
-- notification_log: 알림 발송 기록

-- 1. notification_preferences 테이블
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 마스터 토글
  notification_enabled boolean NOT NULL DEFAULT false,

  -- 스케줄러 상태
  last_notified_at timestamptz,
  next_check_at timestamptz,
  cooldown_days integer NOT NULL DEFAULT 7,

  -- Email 설정
  email_enabled boolean NOT NULL DEFAULT true,
  email_address text,  -- NULL이면 auth.users.email 사용
  monthly_report_enabled boolean NOT NULL DEFAULT false,

  -- 환율 (서버 사이드 접근용)
  exchange_rate numeric,  -- NULL이면 Open Exchange Rates API fallback

  -- 수신거부 토큰
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_uuid()::text::bytea, 'hex'),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

-- 2. notification_log 테이블
CREATE TABLE notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('drift_alert', 'monthly_report', 'test')),
  title text NOT NULL,
  body text,
  metadata jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  retry_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 인덱스
CREATE INDEX idx_notification_log_user_created
  ON notification_log(user_id, created_at DESC);

CREATE INDEX idx_notification_log_retry_queue
  ON notification_log(status) WHERE status IN ('pending', 'retrying');

CREATE INDEX idx_notification_preferences_schedule
  ON notification_preferences(next_check_at)
  WHERE notification_enabled = true;

CREATE INDEX idx_notification_log_email_monthly
  ON notification_log(user_id, created_at)
  WHERE notification_type IN ('drift_alert', 'monthly_report') AND status = 'sent';

CREATE INDEX idx_notification_log_test_rate
  ON notification_log(user_id, created_at)
  WHERE notification_type = 'test';

-- 4. RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- 5. updated_at 트리거 (update_updated_at 함수는 003에서 이미 생성됨)
CREATE TRIGGER trg_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
