-- Tabel til brugerens valgte Salling butikker
CREATE TABLE IF NOT EXISTS user_salling_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  address TEXT,
  city TEXT,
  zip TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  radius_km INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- Tabel til foodwaste data fra Salling
CREATE TABLE IF NOT EXISTS foodwaste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  store_name TEXT,
  brand TEXT,
  zip TEXT,
  ean TEXT NOT NULL,
  product_ean TEXT,
  product_description TEXT NOT NULL,
  product_image TEXT,
  product_categories JSONB,
  original_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2),
  percent_discount DECIMAL(5, 2),
  stock DECIMAL(10, 3),
  stock_unit TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(store_id, ean)
);

-- Index for hurtige opslag
CREATE INDEX IF NOT EXISTS idx_foodwaste_zip ON foodwaste(zip);
CREATE INDEX IF NOT EXISTS idx_foodwaste_store_id ON foodwaste(store_id);
CREATE INDEX IF NOT EXISTS idx_foodwaste_is_active ON foodwaste(is_active);
CREATE INDEX IF NOT EXISTS idx_foodwaste_end_time ON foodwaste(end_time);
CREATE INDEX IF NOT EXISTS idx_user_salling_stores_user_id ON user_salling_stores(user_id);

-- RLS policies
ALTER TABLE user_salling_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE foodwaste ENABLE ROW LEVEL SECURITY;

-- User kan kun se/redigere egne Salling butikker
CREATE POLICY "Users can view own salling stores" ON user_salling_stores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own salling stores" ON user_salling_stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own salling stores" ON user_salling_stores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own salling stores" ON user_salling_stores
  FOR DELETE USING (auth.uid() = user_id);

-- Alle kan læse foodwaste (offentlig data)
CREATE POLICY "Anyone can view foodwaste" ON foodwaste
  FOR SELECT USING (true);

-- Kun service role kan indsætte/opdatere foodwaste
CREATE POLICY "Service role can manage foodwaste" ON foodwaste
  FOR ALL USING (auth.role() = 'service_role');
