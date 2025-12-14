import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface GenerateMealPlanOptions {
  duration_days?: number;
  start_date?: string;
}

interface ShoppingSummary {
  by_store: {
    store: string;
    items: string[];
    estimated_cost: number;
  }[];
}

export function useGenerateMealPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const generateMealPlan = async (options: GenerateMealPlanOptions = {}) => {
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

      toast({
        title: t('mealPlan.generated', 'Madplan genereret!'),
        description: t('mealPlan.generatedDescription', 'Din nye madplan er klar med de bedste tilbud.'),
      });

      return {
        mealPlan: data.meal_plan,
        shoppingSummary: data.shopping_summary as ShoppingSummary,
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
