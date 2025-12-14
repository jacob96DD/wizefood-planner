-- Fix RLS policies for all user-related tables
-- Drop and recreate with proper USING and WITH CHECK clauses

-- ============================================
-- meal_plan_preferences
-- ============================================
DROP POLICY IF EXISTS "Users can view own meal plan preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users can insert own meal plan preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users can update own meal plan preferences" ON meal_plan_preferences;
DROP POLICY IF EXISTS "Users can manage meal_plan_preferences" ON meal_plan_preferences;

CREATE POLICY "Users can manage meal_plan_preferences" ON meal_plan_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- household_inventory
-- ============================================
DROP POLICY IF EXISTS "Users can view own inventory" ON household_inventory;
DROP POLICY IF EXISTS "Users can create inventory items" ON household_inventory;
DROP POLICY IF EXISTS "Users can update own inventory items" ON household_inventory;
DROP POLICY IF EXISTS "Users can delete own inventory items" ON household_inventory;
DROP POLICY IF EXISTS "Users can manage household_inventory" ON household_inventory;

CREATE POLICY "Users can manage household_inventory" ON household_inventory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- user_allergens
-- ============================================
DROP POLICY IF EXISTS "Users can manage own allergens" ON user_allergens;

CREATE POLICY "Users can manage user_allergens" ON user_allergens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- user_preferred_chains
-- ============================================
DROP POLICY IF EXISTS "Users can manage own preferred chains" ON user_preferred_chains;

CREATE POLICY "Users can manage user_preferred_chains" ON user_preferred_chains
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- user_food_dislikes
-- ============================================
DROP POLICY IF EXISTS "Users can manage own food dislikes" ON user_food_dislikes;

CREATE POLICY "Users can manage user_food_dislikes" ON user_food_dislikes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ingredient_preferences
-- ============================================
DROP POLICY IF EXISTS "Users can manage own preferences" ON ingredient_preferences;

CREATE POLICY "Users can manage ingredient_preferences" ON ingredient_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- swipes
-- ============================================
DROP POLICY IF EXISTS "Users can manage own swipes" ON swipes;

CREATE POLICY "Users can manage swipes" ON swipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- meal_plans
-- ============================================
DROP POLICY IF EXISTS "Users can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can create meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can manage meal_plans" ON meal_plans;

CREATE POLICY "Users can manage meal_plans" ON meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- user_progress
-- ============================================
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can manage user_progress" ON user_progress;

CREATE POLICY "Users can manage user_progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- user_shopping_settings
-- ============================================
DROP POLICY IF EXISTS "Users can view own shopping settings" ON user_shopping_settings;
DROP POLICY IF EXISTS "Users can create own shopping settings" ON user_shopping_settings;
DROP POLICY IF EXISTS "Users can update own shopping settings" ON user_shopping_settings;
DROP POLICY IF EXISTS "Users can manage user_shopping_settings" ON user_shopping_settings;

CREATE POLICY "Users can manage user_shopping_settings" ON user_shopping_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- household_members
-- ============================================
DROP POLICY IF EXISTS "Users can view own household members" ON household_members;
DROP POLICY IF EXISTS "Users can create own household members" ON household_members;
DROP POLICY IF EXISTS "Users can update own household members" ON household_members;
DROP POLICY IF EXISTS "Users can delete own household members" ON household_members;
DROP POLICY IF EXISTS "Users can manage household_members" ON household_members;

CREATE POLICY "Users can manage household_members" ON household_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- shopping_lists
-- ============================================
DROP POLICY IF EXISTS "Users can manage own shopping lists" ON shopping_lists;

CREATE POLICY "Users can manage shopping_lists" ON shopping_lists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);