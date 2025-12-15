-- Fix permissions for meal_plan_preferences table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_preferences TO authenticated;