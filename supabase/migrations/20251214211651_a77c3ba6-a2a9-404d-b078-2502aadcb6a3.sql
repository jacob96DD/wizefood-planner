-- Create table for user food dislikes
CREATE TABLE public.user_food_dislikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_name)
);

-- Enable RLS
ALTER TABLE public.user_food_dislikes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own dislikes
CREATE POLICY "Users can manage own food dislikes"
  ON public.user_food_dislikes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);