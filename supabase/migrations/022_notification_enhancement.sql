-- 022: Notification Enhancement
-- Phase 1: 드리프트 알림 세부 설정
-- Phase 2: 리포트 주기 커스터마이징
-- Phase 3: 리포트 콘텐츠 설정

-- ============================================================
-- Phase 1: 드리프트 알림 세부 설정
-- ============================================================

-- 1-1a. notification_preferences 컬럼 추가
ALTER TABLE notification_preferences
  ADD COLUMN alert_threshold_pct numeric DEFAULT NULL
    CHECK (alert_threshold_pct IS NULL OR (alert_threshold_pct > 0 AND alert_threshold_pct <= 100)),
  -- NULL이면 rebalance_settings.threshold_pct 사용 (현재 동작 유지)

  ADD COLUMN alert_severity text NOT NULL DEFAULT 'all'
    CHECK (alert_severity IN ('all', 'major_only')),
  -- 'all': 임계값 초과 시 모두 알림 (현재 동작)
  -- 'major_only': 임계값의 2배 이상 편차만 알림

  ADD COLUMN alert_mode text NOT NULL DEFAULT 'individual'
    CHECK (alert_mode IN ('individual', 'digest')),
  -- 'individual': 즉시 개별 알림 (현재 동작)
  -- 'digest': 쿨다운 기간 동안 누적 후 한 번에 요약 발송

  ADD COLUMN excluded_portfolio_ids text[] NOT NULL DEFAULT '{}';
  -- 알림에서 제외할 포트폴리오 ID 배열 (text[] - Supabase JS 호환)

-- 1-1b. notification_log CHECK 제약조건에 'digest_pending' 추가
ALTER TABLE notification_log
  DROP CONSTRAINT notification_log_status_check;

ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'digest_pending'));

-- 1-1c. digest_pending 전용 부분 인덱스
CREATE INDEX idx_notification_log_digest_pending
  ON notification_log(user_id, created_at)
  WHERE status = 'digest_pending';

-- ============================================================
-- Phase 2: 리포트 주기 커스터마이징
-- ============================================================

-- 2-1a. 리포트 주기 설정 컬럼 추가
ALTER TABLE notification_preferences
  ADD COLUMN report_interval_type text NOT NULL DEFAULT 'monthly'
    CHECK (report_interval_type IN ('weekly', 'biweekly', 'monthly', 'custom')),

  ADD COLUMN report_custom_days integer DEFAULT NULL
    CHECK (report_custom_days IS NULL OR (report_custom_days >= 7 AND report_custom_days <= 90)),

  ADD COLUMN report_day_of_week integer DEFAULT NULL
    CHECK (report_day_of_week IS NULL OR (report_day_of_week >= 0 AND report_day_of_week <= 6)),
  -- 0=일, 1=월, ..., 6=토

  ADD COLUMN report_day_of_month integer DEFAULT NULL
    CHECK (report_day_of_month IS NULL OR (report_day_of_month >= 1 AND report_day_of_month <= 28)),

  ADD COLUMN report_last_sent_at timestamptz DEFAULT NULL,

  ADD COLUMN report_next_send_at timestamptz DEFAULT NULL;

-- 2-1b. 기존 monthly_report_enabled=true 사용자의 report_next_send_at 초기화
UPDATE notification_preferences
SET report_next_send_at = (
  date_trunc('month', now() + interval '1 month') + interval '22 hours'
)
WHERE monthly_report_enabled = true
  AND report_next_send_at IS NULL;

-- ============================================================
-- Phase 3: 리포트 콘텐츠 설정
-- ============================================================

-- 3-1. 리포트 콘텐츠 설정 (JSONB)
ALTER TABLE notification_preferences
  ADD COLUMN report_sections jsonb NOT NULL DEFAULT '{"summary":true,"portfolios":true,"drift_table":true,"activity":true}';
