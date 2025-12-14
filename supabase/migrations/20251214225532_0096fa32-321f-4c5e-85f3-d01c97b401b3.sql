-- Add real-life calorie tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS real_life_description text,
ADD COLUMN IF NOT EXISTS real_life_calories_per_week integer,
ADD COLUMN IF NOT EXISTS real_life_protein_per_week integer,
ADD COLUMN IF NOT EXISTS real_life_carbs_per_week integer,
ADD COLUMN IF NOT EXISTS real_life_fat_per_week integer;