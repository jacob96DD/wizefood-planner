-- ============================================================
-- FIX ALLE RLS POLICIES - KØR DENNE I SUPABASE SQL EDITOR
-- ============================================================

-- ============ MEAL_PLANS (mangler DELETE policy) ============
DROP POLICY IF EXISTS "Users can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can manage meal_plans" ON meal_plans;

CREATE POLICY "Users can manage meal_plans" ON meal_plans FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============ DAILY_MEAL_LOG ============
DROP POLICY IF EXISTS "Users can view own meal log" ON daily_meal_log;
DROP POLICY IF EXISTS "Users can insert own meal log" ON daily_meal_log;
DROP POLICY IF EXISTS "Users can update own meal log" ON daily_meal_log;
DROP POLICY IF EXISTS "Users can delete own meal log" ON daily_meal_log;
DROP POLICY IF EXISTS "Users can manage daily_meal_log" ON daily_meal_log;

CREATE POLICY "Users can manage daily_meal_log" ON daily_meal_log FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============ USER_PROGRESS ============
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can manage user_progress" ON user_progress;

CREATE POLICY "Users can manage user_progress" ON user_progress FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============ USER_FOOD_DISLIKES ============
DROP POLICY IF EXISTS "Users can view own food dislikes" ON user_food_dislikes;
DROP POLICY IF EXISTS "Users can insert own food dislikes" ON user_food_dislikes;
DROP POLICY IF EXISTS "Users can update own food dislikes" ON user_food_dislikes;
DROP POLICY IF EXISTS "Users can delete own food dislikes" ON user_food_dislikes;
DROP POLICY IF EXISTS "Users can manage user_food_dislikes" ON user_food_dislikes;

CREATE POLICY "Users can manage user_food_dislikes" ON user_food_dislikes FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============ USER_DIETARY_PREFERENCES ============
DROP POLICY IF EXISTS "Users can view own dietary preferences" ON user_dietary_preferences;
DROP POLICY IF EXISTS "Users can insert own dietary preferences" ON user_dietary_preferences;
DROP POLICY IF EXISTS "Users can update own dietary preferences" ON user_dietary_preferences;
DROP POLICY IF EXISTS "Users can delete own dietary preferences" ON user_dietary_preferences;
DROP POLICY IF EXISTS "Users can manage user_dietary_preferences" ON user_dietary_preferences;

CREATE POLICY "Users can manage user_dietary_preferences" ON user_dietary_preferences FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============ ENABLE RLS ============
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_meal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_food_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dietary_preferences ENABLE ROW LEVEL SECURITY;

-- ============ VERIFICATION ============
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('meal_plans', 'daily_meal_log', 'user_progress', 'user_food_dislikes', 'user_dietary_preferences')
ORDER BY tablename, policyname;
