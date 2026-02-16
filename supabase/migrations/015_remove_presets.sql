-- 015: 프리셋 기능 제거
-- 프리셋 테이블, 관련 RPC 함수, active_preset_id 컬럼을 삭제합니다.
-- executions.preset_name 컬럼은 기존 기록 보존을 위해 유지합니다.

-- 1. active_preset_id 컬럼 제거 (presets 테이블 FK 의존성)
ALTER TABLE manual_portfolios DROP COLUMN IF EXISTS active_preset_id;

-- 2. 프리셋 적용 RPC 함수 삭제
DROP FUNCTION IF EXISTS apply_preset_to_manual(uuid, jsonb, uuid);
DROP FUNCTION IF EXISTS apply_preset_to_manual(uuid, jsonb);
DROP FUNCTION IF EXISTS apply_preset_to_targets(uuid, jsonb);

-- 3. presets 테이블 삭제 (RLS 정책, 인덱스, 트리거 자동 삭제)
DROP TABLE IF EXISTS presets CASCADE;
