-- Create user_progress table for tracking weight, body measurements over time
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  body_fat_percentage NUMERIC,
  muscle_mass_kg NUMERIC,
  waist_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_progress
CREATE POLICY "Users can view own progress"
ON public.user_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON public.user_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_user_progress_user_recorded ON public.user_progress(user_id, recorded_at DESC);