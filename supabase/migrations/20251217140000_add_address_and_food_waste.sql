-- Add address fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude decimal;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude decimal;

-- Create user_salling_stores table for storing user's preferred Salling Group stores
CREATE TABLE IF NOT EXISTS user_salling_stores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  salling_store_id text NOT NULL,
  store_name text NOT NULL,
  brand text NOT NULL, -- 'netto', 'foetex', 'bilka'
  address text,
  city text,
  distance_km decimal,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, salling_store_id)
);

-- Create food_waste_products table for caching Salling food waste offers
CREATE TABLE IF NOT EXISTS food_waste_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salling_store_id text NOT NULL,
  store_name text,
  brand text,
  ean text NOT NULL,
  product_name text NOT NULL,
  product_description text,
  image_url text,
  original_price decimal NOT NULL,
  new_price decimal NOT NULL,
  discount_percent decimal NOT NULL,
  stock integer,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  last_synced timestamptz DEFAULT now(),
  UNIQUE(salling_store_id, ean)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_salling_stores_user ON user_salling_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_salling_stores_enabled ON user_salling_stores(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_food_waste_store ON food_waste_products(salling_store_id);
CREATE INDEX IF NOT EXISTS idx_food_waste_valid ON food_waste_products(valid_until);
CREATE INDEX IF NOT EXISTS idx_food_waste_discount ON food_waste_products(discount_percent DESC);

-- Enable RLS
ALTER TABLE user_salling_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_waste_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_salling_stores
DROP POLICY IF EXISTS "Users can view own salling stores" ON user_salling_stores;
CREATE POLICY "Users can view own salling stores" ON user_salling_stores
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own salling stores" ON user_salling_stores;
CREATE POLICY "Users can insert own salling stores" ON user_salling_stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own salling stores" ON user_salling_stores;
CREATE POLICY "Users can update own salling stores" ON user_salling_stores
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own salling stores" ON user_salling_stores;
CREATE POLICY "Users can delete own salling stores" ON user_salling_stores
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for food_waste_products (public read)
DROP POLICY IF EXISTS "Anyone can read food waste" ON food_waste_products;
CREATE POLICY "Anyone can read food waste" ON food_waste_products
  FOR SELECT USING (true);

-- Service role can insert/update food waste
DROP POLICY IF EXISTS "Service can manage food waste" ON food_waste_products;
CREATE POLICY "Service can manage food waste" ON food_waste_products
  FOR ALL USING (true);
