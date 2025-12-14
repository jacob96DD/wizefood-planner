-- Grant permissions for profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Grant permissions for household_members table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;

-- Grant permissions for user_allergens table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_allergens TO authenticated;

-- Grant permissions for ingredient_preferences table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_preferences TO authenticated;

-- Grant permissions for swipes table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;

-- Grant permissions for meal_plans table
GRANT SELECT, INSERT ON public.meal_plans TO authenticated;

-- Grant permissions for shopping_lists table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;