-- Tilføj felter til swipes for AI-genererede retter
ALTER TABLE public.swipes 
ADD COLUMN IF NOT EXISTS meal_plan_recipe_title TEXT,
ADD COLUMN IF NOT EXISTS meal_plan_key_ingredients TEXT[];