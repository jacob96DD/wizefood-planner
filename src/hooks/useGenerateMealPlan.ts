import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { MealRecipe, MacroTargets } from '@/components/MealOptionSwiper';

interface GenerateMealPlanOptions {
  duration_days?: number;
  start_date?: string;
}

export interface GenerateMealPlanResult {
  recipes: MealRecipe[];
  recipesNeeded: number;
  macroTargets: MacroTargets;
  durationDays: number;
}

export function useGenerateMealPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const generateMealPlan = async (options: GenerateMealPlanOptions = {}): Promise<GenerateMealPlanResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          duration_days: options.duration_days || 7,
          start_date: options.start_date || new Date().toISOString().split('T')[0],
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // NY STRUKTUR: Én samlet liste af retter
      const recipes: MealRecipe[] = data.recipes || [];
      const recipesNeeded: number = data.recipes_needed || 7;

      const macroTargets: MacroTargets = data.macro_targets || {
        calories: 2000,
        protein: 120,
        carbs: 200,
        fat: 70,
      };

      toast({
        title: t('mealPlan.optionsReady', 'Retter klar!'),
        description: t('mealPlan.swipeToSelect', 'Swipe for at vælge dine retter.'),
      });

      return {
        recipes,
        recipesNeeded,
        macroTargets,
        durationDays: options.duration_days || 7,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke generere madplan';
      setError(message);
      toast({
        title: t('mealPlan.error', 'Fejl'),
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateMealPlan,
    loading,
    error,
  };
}
