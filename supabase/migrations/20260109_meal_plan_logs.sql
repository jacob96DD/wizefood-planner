-- Meal Plan Generation Logs
-- Gemmer alle genererede madplaner til kvalitetsanalyse

CREATE TABLE IF NOT EXISTS meal_plan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Bruger info
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Request/Input - Hvad brugeren ønskede
  request JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: duration_days, custom_request, selected_foodwaste, cooking_style

  -- Targets - Hvad vi sigtede efter
  targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: calories, protein, carbs, fat, recipes_needed, budget

  -- Results - Hvad vi faktisk genererede
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: total_calories, total_protein, avg_calories_per_day, recipes_generated

  -- Recipes - Alle opskrifter med detaljer
  recipes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array af: {id, title, calories, protein, carbs, fat, prep_time, cook_time, estimated_price, ingredients_count}

  -- Prices - Prisberegninger
  prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: total_estimated, per_portion, savings_from_offers, offers_used[]

  -- Ingredients - Alle ingredienser samlet
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array af: {name, total_amount, unit, estimated_price}

  -- Quality metrics
  quality_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: calorie_accuracy_pct, macro_balance_score, variety_score, prep_time_avg

  -- AI Response metadata
  ai_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: model, tokens_used, response_time_ms, raw_response_length

  -- Prompts - den fulde prompt der blev sendt til AI
  prompts JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Indeholder: system_prompt, user_prompt, system_prompt_length, user_prompt_length, total_prompt_length

  -- Status
  status TEXT DEFAULT 'completed',
  error_message TEXT
);

-- Index for hurtig query på bruger og dato
CREATE INDEX IF NOT EXISTS idx_meal_plan_logs_user_id ON meal_plan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_logs_created_at ON meal_plan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_logs_status ON meal_plan_logs(status);

-- RLS Policies
ALTER TABLE meal_plan_logs ENABLE ROW LEVEL SECURITY;

-- Brugere kan kun se deres egne logs
CREATE POLICY "Users can view own logs" ON meal_plan_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role kan indsætte (Edge Function)
CREATE POLICY "Service role can insert logs" ON meal_plan_logs
  FOR INSERT WITH CHECK (true);

-- Admins kan se alle logs (til kvalitetsanalyse)
CREATE POLICY "Admins can view all logs" ON meal_plan_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND email LIKE '%@wizefood.dk'
    )
  );

COMMENT ON TABLE meal_plan_logs IS 'Logger alle genererede madplaner for kvalitetsanalyse og debugging';
