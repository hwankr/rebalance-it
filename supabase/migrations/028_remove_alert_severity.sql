-- 028: Remove alert_severity (알림 민감도)
--
-- alert_severity는 threshold에 2배 배수를 곱하는 것이 전부로,
-- 사용자가 alert_threshold_pct를 직접 조정하면 동일한 효과.
-- major_only 사용자의 기존 동작을 보존하기 위해 threshold를 2배로 조정 후 컬럼 제거.

BEGIN;

-- major_only 사용자: 실제 적용되던 threshold 보존 (cap at 100)
UPDATE notification_preferences
SET alert_threshold_pct = LEAST(COALESCE(alert_threshold_pct, 5) * 2, 100)
WHERE alert_severity = 'major_only';

-- 컬럼 제거
ALTER TABLE notification_preferences DROP COLUMN alert_severity;

COMMIT;
