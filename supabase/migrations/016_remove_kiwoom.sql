-- 키움 API 제거에 따른 DB 정리
-- data_source 컬럼은 보존 (DEFAULT 'manual', 향후 확장 여지)

-- 1. stock_targets 테이블 삭제 (키움 모드 전용, 수동 모드에서는 manual_stocks.target_pct 사용)
DROP TABLE IF EXISTS stock_targets;

-- 2. apply_preset_to_targets RPC 함수 삭제 (stock_targets 의존)
DROP FUNCTION IF EXISTS apply_preset_to_targets(uuid, uuid);

-- 3. 혹시 남아있을 수 있는 kiwoom 행 정리 (안전장치)
UPDATE rebalance_settings SET data_source = 'manual' WHERE data_source = 'kiwoom';
