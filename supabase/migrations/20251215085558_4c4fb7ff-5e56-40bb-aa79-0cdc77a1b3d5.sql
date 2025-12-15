-- Fix RLS policy for discover_recipes (change from RESTRICTIVE to PERMISSIVE)
DROP POLICY IF EXISTS "Anyone can view discover_recipes" ON public.discover_recipes;
CREATE POLICY "Anyone can view discover_recipes" 
  ON public.discover_recipes 
  FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Create daily_meal_log table for meal tracking
CREATE TABLE public.daily_meal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  
  -- Checkmarks for planlagte måltider
  breakfast_completed BOOLEAN DEFAULT false,
  lunch_completed BOOLEAN DEFAULT false,
  dinner_completed BOOLEAN DEFAULT false,
  
  -- Skipped meals
  breakfast_skipped BOOLEAN DEFAULT false,
  lunch_skipped BOOLEAN DEFAULT false,
  dinner_skipped BOOLEAN DEFAULT false,
  
  -- Billeder af mad spist (som MyFitnessPal)
  food_photos JSONB DEFAULT '[]',
  
  -- Ekstra mad uden for planen
  extra_calories INTEGER DEFAULT 0,
  extra_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_meal_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for daily_meal_log
CREATE POLICY "Users can manage own meal logs"
  ON public.daily_meal_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_meal_log_updated_at
  BEFORE UPDATE ON public.daily_meal_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();