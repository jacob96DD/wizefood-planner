-- Create meal_plan_preferences table for storing user's meal planning configuration
CREATE TABLE public.meal_plan_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Cooking style: 'daily', 'meal_prep_2', 'meal_prep_3', 'meal_prep_4'
  cooking_style TEXT DEFAULT 'daily',
  
  -- Which meals to include
  skip_breakfast BOOLEAN DEFAULT false,
  skip_lunch BOOLEAN DEFAULT false,
  skip_dinner BOOLEAN DEFAULT false,
  
  -- Fixed meals (JSONB array)
  -- Format: [{"day": "all", "meal": "breakfast", "description": "Franskbrød med nutella", "calories": 350, "protein": 8, "carbs": 45, "fat": 15}]
  fixed_meals JSONB DEFAULT '[]'::jsonb,
  
  -- Exceptions like cheat meals
  -- Format: [{"day": "saturday", "meal": "dinner", "type": "cheat_meal", "description": "Fri aftensmad"}]
  exceptions JSONB DEFAULT '[]'::jsonb,
  
  -- Extra calories outside meal plan (real-life)
  -- Format: [{"description": "10 øl om ugen", "calories_per_week": 1500, "protein": 0, "carbs": 150, "fat": 0}]
  extra_calories JSONB DEFAULT '[]'::jsonb,
  
  -- Cooking time preferences (in minutes)
  weekday_max_cook_time INTEGER DEFAULT 30,
  weekend_max_cook_time INTEGER DEFAULT 60,
  meal_prep_time INTEGER DEFAULT 120,
  
  -- How many alternatives to generate per meal (0-3)
  generate_alternatives INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_plan_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own meal plan preferences"
  ON public.meal_plan_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plan preferences"
  ON public.meal_plan_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plan preferences"
  ON public.meal_plan_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_meal_plan_preferences_updated_at
  BEFORE UPDATE ON public.meal_plan_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();