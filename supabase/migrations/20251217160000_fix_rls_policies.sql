-- Fix missing RLS policies for tables causing 403 errors

-- ============ user_dietary_preferences ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_dietary_preferences' AND policyname = 'Users can view own dietary preferences') THEN
    CREATE POLICY "Users can view own dietary preferences" ON user_dietary_preferences FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_dietary_preferences' AND policyname = 'Users can insert own dietary preferences') THEN
    CREATE POLICY "Users can insert own dietary preferences" ON user_dietary_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_dietary_preferences' AND policyname = 'Users can update own dietary preferences') THEN
    CREATE POLICY "Users can update own dietary preferences" ON user_dietary_preferences FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_dietary_preferences' AND policyname = 'Users can delete own dietary preferences') THEN
    CREATE POLICY "Users can delete own dietary preferences" ON user_dietary_preferences FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============ user_food_dislikes ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_food_dislikes' AND policyname = 'Users can view own food dislikes') THEN
    CREATE POLICY "Users can view own food dislikes" ON user_food_dislikes FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_food_dislikes' AND policyname = 'Users can insert own food dislikes') THEN
    CREATE POLICY "Users can insert own food dislikes" ON user_food_dislikes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_food_dislikes' AND policyname = 'Users can update own food dislikes') THEN
    CREATE POLICY "Users can update own food dislikes" ON user_food_dislikes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_food_dislikes' AND policyname = 'Users can delete own food dislikes') THEN
    CREATE POLICY "Users can delete own food dislikes" ON user_food_dislikes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============ daily_meal_log ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_meal_log' AND policyname = 'Users can view own meal log') THEN
    CREATE POLICY "Users can view own meal log" ON daily_meal_log FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_meal_log' AND policyname = 'Users can insert own meal log') THEN
    CREATE POLICY "Users can insert own meal log" ON daily_meal_log FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_meal_log' AND policyname = 'Users can update own meal log') THEN
    CREATE POLICY "Users can update own meal log" ON daily_meal_log FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_meal_log' AND policyname = 'Users can delete own meal log') THEN
    CREATE POLICY "Users can delete own meal log" ON daily_meal_log FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============ user_progress ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can view own progress') THEN
    CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can insert own progress') THEN
    CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can update own progress') THEN
    CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can delete own progress') THEN
    CREATE POLICY "Users can delete own progress" ON user_progress FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============ Enable RLS if not already enabled ============
ALTER TABLE user_dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_food_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_meal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
