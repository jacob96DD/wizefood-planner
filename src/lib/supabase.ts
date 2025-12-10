import type { Tables } from '@/integrations/supabase/types';

// Type aliases for easier usage
export type Profile = Tables<'profiles'>;
export type Recipe = Omit<Tables<'recipes'>, 'ingredients' | 'instructions'> & {
  ingredients: { name: string; amount: string; unit: string }[] | null;
  instructions: string[] | null;
};
export type Swipe = Tables<'swipes'>;
export type MealPlan = Tables<'meal_plans'>;
export type ShoppingList = Tables<'shopping_lists'>;
export type Allergen = Tables<'allergens'>;
export type UserAllergen = Tables<'user_allergens'>;
export type Store = Tables<'stores'>;
export type Offer = Tables<'offers'>;
