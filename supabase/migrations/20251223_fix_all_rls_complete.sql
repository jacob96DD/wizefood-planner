-- ============================================================
-- KOMPLET RLS FIX - KØR DENNE I SUPABASE SQL EDITOR
-- Denne migration fixer alle 403 Forbidden fejl
--
-- VIGTIGT: Kør denne SQL i Supabase Dashboard > SQL Editor
-- ============================================================

-- ============ USER_PROGRESS - FJERN ALLE GAMLE POLICIES ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_progress' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_progress', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_progress_select" ON user_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert" ON user_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update" ON user_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_progress_delete" ON user_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON user_progress TO authenticated;

-- ============ USER_FOOD_DISLIKES - FJERN ALLE GAMLE POLICIES ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_food_dislikes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_food_dislikes', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE user_food_dislikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_food_dislikes_select" ON user_food_dislikes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_food_dislikes_insert" ON user_food_dislikes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_food_dislikes_update" ON user_food_dislikes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_food_dislikes_delete" ON user_food_dislikes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON user_food_dislikes TO authenticated;

-- ============ PANTRY_STAPLES - FJERN ALLE GAMLE POLICIES ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'pantry_staples' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON pantry_staples', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE pantry_staples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pantry_staples_select" ON pantry_staples
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON pantry_staples TO authenticated;

-- ============ USER_ALLERGENS ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_allergens' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_allergens', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE user_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_allergens_select" ON user_allergens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_allergens_insert" ON user_allergens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_allergens_update" ON user_allergens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_allergens_delete" ON user_allergens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON user_allergens TO authenticated;

-- ============ USER_PREFERRED_CHAINS ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_preferred_chains' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_preferred_chains', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE user_preferred_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferred_chains_select" ON user_preferred_chains
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferred_chains_insert" ON user_preferred_chains
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferred_chains_update" ON user_preferred_chains
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferred_chains_delete" ON user_preferred_chains
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON user_preferred_chains TO authenticated;

-- ============ USER_DIETARY_PREFERENCES ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_dietary_preferences' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_dietary_preferences', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE user_dietary_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_dietary_preferences_select" ON user_dietary_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_dietary_preferences_insert" ON user_dietary_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_dietary_preferences_update" ON user_dietary_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_dietary_preferences_delete" ON user_dietary_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON user_dietary_preferences TO authenticated;

-- ============ HOUSEHOLD_INVENTORY ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'household_inventory' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON household_inventory', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE household_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_inventory_select" ON household_inventory
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "household_inventory_insert" ON household_inventory
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "household_inventory_update" ON household_inventory
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "household_inventory_delete" ON household_inventory
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON household_inventory TO authenticated;

-- ============ VERIFICATION - Viser alle policies ============
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_progress', 'user_food_dislikes', 'pantry_staples',
                    'user_allergens', 'user_preferred_chains', 'user_dietary_preferences',
                    'household_inventory')
ORDER BY tablename, policyname;
