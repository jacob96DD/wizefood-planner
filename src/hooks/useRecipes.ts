import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Recipe } from '@/lib/supabase';

export function useRecipes() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['recipes', user?.id],
    queryFn: async (): Promise<Recipe[]> => {
      // Fetch all recipes
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*');

      if (recipesError) throw recipesError;

      if (!user) {
        return (recipes || []).map(r => ({
          ...r,
          ingredients: r.ingredients as Recipe['ingredients'],
          instructions: r.instructions as Recipe['instructions'],
        }));
      }

      // Fetch user's previous swipes to exclude already swiped recipes
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('recipe_id')
        .eq('user_id', user.id);

      if (swipesError) throw swipesError;

      const swipedRecipeIds = new Set(swipes?.map(s => s.recipe_id) || []);

      // Filter out already swiped recipes
      const unswipedRecipes = (recipes || [])
        .filter(r => !swipedRecipeIds.has(r.id))
        .map(r => ({
          ...r,
          ingredients: r.ingredients as Recipe['ingredients'],
          instructions: r.instructions as Recipe['instructions'],
        }));

      return unswipedRecipes;
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSaveSwipe() {
  const { user } = useAuthStore();

  const saveSwipe = async (recipeId: string, direction: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('swipes')
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        direction,
      });

    if (error) {
      console.error('Error saving swipe:', error);
    }
  };

  return { saveSwipe };
}
