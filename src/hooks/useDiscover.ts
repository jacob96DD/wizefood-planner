import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface DiscoverRecipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  key_ingredients: string[] | null;
  category: string | null;
}

export type Rating = 'love' | 'like' | 'dislike' | 'hate';

export function useDiscover() {
  const [recipes, setRecipes] = useState<DiscoverRecipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipedCount, setSwipedCount] = useState(0);
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  const fetchRecipes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Hent alle discover recipes
      const { data: allRecipes, error: recipesError } = await supabase
        .from('discover_recipes')
        .select('*')
        .order('created_at');

      if (recipesError) throw recipesError;

      // Hent brugerens eksisterende swipes på discover recipes
      const { data: existingSwipes, error: swipesError } = await supabase
        .from('swipes')
        .select('discover_recipe_id')
        .eq('user_id', user.id)
        .not('discover_recipe_id', 'is', null);

      if (swipesError) throw swipesError;

      const swipedIds = new Set(existingSwipes?.map(s => s.discover_recipe_id) || []);
      setSwipedCount(swipedIds.size);

      // Filtrer kun dem der ikke er swiped
      const unswipedRecipes = (allRecipes || []).filter(r => !swipedIds.has(r.id));
      setRecipes(unswipedRecipes);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching discover recipes:', error);
      toast({
        title: t('common.error'),
        description: 'Kunne ikke hente opskrifter',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const recordRating = async (rating: Rating) => {
    if (!user || !currentRecipe) return;

    try {
      // Map rating til direction for bagudkompatibilitet
      const directionMap: Record<Rating, string> = {
        love: 'up',
        like: 'right',
        dislike: 'left',
        hate: 'down',
      };

      const { error } = await supabase.from('swipes').insert({
        user_id: user.id,
        discover_recipe_id: currentRecipe.id,
        direction: directionMap[rating],
        rating: rating,
      });

      if (error) throw error;

      setSwipedCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error recording rating:', error);
      toast({
        title: t('common.error'),
        description: 'Kunne ikke gemme din bedømmelse',
        variant: 'destructive',
      });
    }
  };

  const resetProgress = async () => {
    if (!user) return;

    try {
      // Slet alle discover swipes for brugeren
      const { error } = await supabase
        .from('swipes')
        .delete()
        .eq('user_id', user.id)
        .not('discover_recipe_id', 'is', null);

      if (error) throw error;

      await fetchRecipes();
      toast({
        title: t('discover.reset', 'Nulstillet'),
        description: t('discover.resetDesc', 'Du kan nu starte forfra med at bedømme retter'),
      });
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  };

  const currentRecipe = recipes[currentIndex] || null;
  const totalRecipes = recipes.length + swipedCount;
  const progress = totalRecipes > 0 ? Math.round((swipedCount / totalRecipes) * 100) : 0;
  const isComplete = currentIndex >= recipes.length && recipes.length > 0;

  return {
    currentRecipe,
    loading,
    recordRating,
    resetProgress,
    swipedCount,
    totalRecipes,
    progress,
    isComplete,
    remainingCount: recipes.length - currentIndex,
  };
}
