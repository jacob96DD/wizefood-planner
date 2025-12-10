import { createClient } from '@supabase/supabase-js';

// These will need to be set when connecting to external Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on database schema
export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  age_years?: number;
  activity_level?: string;
  dietary_goal?: string;
  daily_calories?: number;
  daily_protein_target?: number;
  daily_carbs_target?: number;
  daily_fat_target?: number;
  budget_per_week?: number;
  people_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: { name: string; amount: string; unit: string }[];
  instructions?: string[];
  tags?: string[];
  created_at?: string;
}

export interface Swipe {
  id: string;
  user_id: string;
  recipe_id: string;
  direction: 'left' | 'right' | 'up' | 'down';
  created_at?: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  title: string;
  duration_days: number;
  meals: {
    day: number;
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
  }[];
  total_cost?: number;
  total_savings?: number;
  created_at?: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  meal_plan_id?: string;
  items: {
    name: string;
    amount: string;
    unit: string;
    checked: boolean;
    price?: number;
    offer_price?: number;
  }[];
  total_price?: number;
  completed: boolean;
  created_at?: string;
}

export interface Allergen {
  id: string;
  name: string;
  icon?: string;
  created_at?: string;
}

export interface Offer {
  id: string;
  store_id: string;
  flyer_date: string;
  product_name: string;
  brand?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  price: number;
  raw_text?: string;
  created_at?: string;
}

export interface Store {
  id: string;
  name: string;
  chain: string;
  created_at?: string;
}
