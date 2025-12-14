-- Create household_members table for storing family/household member profiles
CREATE TABLE public.household_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  age_years INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  daily_calories INTEGER,
  daily_protein_target INTEGER,
  daily_carbs_target INTEGER,
  daily_fat_target INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own household members" 
ON public.household_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own household members" 
ON public.household_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own household members" 
ON public.household_members 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own household members" 
ON public.household_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_household_members_updated_at
BEFORE UPDATE ON public.household_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();