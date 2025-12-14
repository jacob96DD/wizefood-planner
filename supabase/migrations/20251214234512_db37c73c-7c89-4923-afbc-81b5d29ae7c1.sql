-- Create dietary preferences table
CREATE TABLE public.user_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference TEXT NOT NULL CHECK (preference IN ('omnivore', 'vegetarian', 'pescetarian', 'vegan', 'flexitarian')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_dietary_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own dietary preferences
CREATE POLICY "Users can manage dietary_preferences" ON public.user_dietary_preferences
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_dietary_preferences_updated_at
BEFORE UPDATE ON public.user_dietary_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();