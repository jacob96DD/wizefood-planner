-- Create household_inventory table for tracking user's food items
CREATE TABLE public.household_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT DEFAULT 'pantry', -- 'fridge', 'freezer', 'pantry'
  expires_at DATE,
  is_depleted BOOLEAN DEFAULT false,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.household_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own inventory" 
ON public.household_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create inventory items" 
ON public.household_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory items" 
ON public.household_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory items" 
ON public.household_inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_household_inventory_updated_at
BEFORE UPDATE ON public.household_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_household_inventory_user_id ON public.household_inventory(user_id);
CREATE INDEX idx_household_inventory_category ON public.household_inventory(category);
CREATE INDEX idx_household_inventory_expires_at ON public.household_inventory(expires_at);