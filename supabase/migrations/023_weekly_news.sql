-- 023: Weekly News Briefing
-- manual_stocks에 news_enabled 컬럼 추가
-- notification_preferences에 weekly_news_enabled 컬럼 추가
-- notification_log의 notification_type 제약 조건 업데이트

-- 1. manual_stocks에 뉴스 수신 설정 추가
ALTER TABLE manual_stocks
  ADD COLUMN news_enabled boolean NOT NULL DEFAULT false;

-- 2. notification_preferences에 주간 뉴스 설정 추가
ALTER TABLE notification_preferences
  ADD COLUMN weekly_news_enabled boolean NOT NULL DEFAULT false;

-- 3. notification_log의 notification_type 제약 조건 업데이트
ALTER TABLE notification_log
  DROP CONSTRAINT notification_log_notification_type_check;

ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_notification_type_check
  CHECK (notification_type IN ('drift_alert', 'monthly_report', 'test', 'weekly_news'));

-- 4. notification_log 인덱스 추가 (주간 뉴스 발송 조회용)
CREATE INDEX idx_notification_log_weekly_news
  ON notification_log(user_id, created_at)
  WHERE notification_type = 'weekly_news' AND status = 'sent';
