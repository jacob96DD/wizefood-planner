-- Opret shopping_trips tabel til multi-butik indkøb
CREATE TABLE public.shopping_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  store_chain_id UUID REFERENCES public.store_chains(id),
  planned_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_savings NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Opret user_shopping_settings tabel til brugerindstillinger
CREATE TABLE public.user_shopping_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  min_savings_per_store INTEGER DEFAULT 30,
  max_stores_per_week INTEGER DEFAULT 3,
  preferred_shopping_days TEXT[] DEFAULT ARRAY['saturday']::TEXT[],
  prefer_single_store BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shopping_settings ENABLE ROW LEVEL SECURITY;

-- RLS for shopping_trips (via shopping_lists user_id)
CREATE POLICY "Users can view own shopping trips"
  ON public.shopping_trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own shopping trips"
  ON public.shopping_trips FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shopping trips"
  ON public.shopping_trips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shopping trips"
  ON public.shopping_trips FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

-- RLS for user_shopping_settings
CREATE POLICY "Users can view own shopping settings"
  ON public.user_shopping_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shopping settings"
  ON public.user_shopping_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping settings"
  ON public.user_shopping_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_shopping_settings_updated_at
  BEFORE UPDATE ON public.user_shopping_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();