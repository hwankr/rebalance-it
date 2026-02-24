-- user_profiles.role 컬럼 보호: 사용자가 직접 role을 변경할 수 없도록 제한
-- role 변경은 service_role (서버 사이드) 에서만 가능

CREATE OR REPLACE FUNCTION prevent_role_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role은 제한하지 않음 (서버 사이드에서 admin 부여 가능)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 일반 사용자가 role을 변경하려 할 때 차단
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role 변경은 허용되지 않습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_role_self_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_update();
