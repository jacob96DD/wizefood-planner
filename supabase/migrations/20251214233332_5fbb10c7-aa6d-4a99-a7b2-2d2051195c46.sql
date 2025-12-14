-- Fix RLS for meal_plan_preferences - lav én simpel ALL policy
DROP POLICY IF EXISTS "Users can select own preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users manage own preferences" ON meal_plan_preferences;

CREATE POLICY "Users manage own preferences" 
ON meal_plan_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);