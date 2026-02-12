-- 1. user_id 컬럼 추가
ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE executions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 인덱스
CREATE INDEX idx_profiles_user_id ON profiles (user_id);
CREATE INDEX idx_executions_user_id ON executions (user_id);
CREATE INDEX idx_settings_user_id ON settings (user_id);

-- 3. settings unique constraint 변경 (user별 key 고유)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE settings ADD CONSTRAINT settings_user_key_unique UNIQUE (user_id, key);

-- 4. RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 5. profiles RLS
CREATE POLICY "Users can view own profiles" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profiles" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- 6. executions RLS
CREATE POLICY "Users can view own executions" ON executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own executions" ON executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own executions" ON executions FOR DELETE USING (auth.uid() = user_id);

-- 7. settings RLS
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (auth.uid() = user_id);
