-- Fix meal_plans RLS policy til at være PERMISSIVE så sletning virker
DROP POLICY IF EXISTS "Users can manage meal_plans" ON meal_plans;

CREATE POLICY "Users can manage meal_plans" 
ON meal_plans 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);