-- Phase 3: 자동매매 제거 관련 DB 정리
-- 1. executions 테이블에 type 컬럼 추가 (기존 데이터는 'execution'으로 유지)
ALTER TABLE executions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'execution';
-- 새 시뮬레이션 기록은 앱에서 'simulation'으로 명시 삽입

-- 2. rebalance_settings 테이블에서 data_source 관련 정리
-- CHECK 제약조건 삭제 (있는 경우)
ALTER TABLE rebalance_settings DROP CONSTRAINT IF EXISTS rebalance_settings_data_source_check;

-- 기존 UNIQUE 인덱스 삭제 (user_id, data_source)
DROP INDEX IF EXISTS idx_rebalance_settings_user_source;

-- 중복 행 정리: user_id당 하나만 남기기 (manual 우선 보존)
DELETE FROM rebalance_settings a
  USING rebalance_settings b
  WHERE a.user_id = b.user_id
    AND a.data_source = 'kiwoom'
    AND b.data_source = 'manual';

-- 새 UNIQUE 인덱스 추가 (user_id만)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rebalance_settings_user
  ON rebalance_settings (user_id);

-- data_source 컬럼의 기본값을 'manual'로 변경
ALTER TABLE rebalance_settings ALTER COLUMN data_source SET DEFAULT 'manual';
