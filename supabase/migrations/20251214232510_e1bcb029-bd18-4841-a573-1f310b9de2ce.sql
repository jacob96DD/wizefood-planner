-- Drop existing policy and create separate policies for clarity
DROP POLICY IF EXISTS "Users can manage meal_plan_preferences" ON meal_plan_preferences;

CREATE POLICY "Users can select own preferences" 
ON meal_plan_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON meal_plan_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON meal_plan_preferences FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add max_weekly_budget column
ALTER TABLE meal_plan_preferences 
ADD COLUMN IF NOT EXISTS max_weekly_budget INTEGER DEFAULT 800;