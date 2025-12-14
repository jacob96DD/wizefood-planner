-- Create user_preferred_chains table
CREATE TABLE public.user_preferred_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chain_id UUID NOT NULL REFERENCES public.store_chains(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, chain_id)
);

-- Enable RLS
ALTER TABLE public.user_preferred_chains ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own preferred chains
CREATE POLICY "Users can manage own preferred chains" 
ON public.user_preferred_chains
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_preferred_chains TO authenticated;