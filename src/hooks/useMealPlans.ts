import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Json } from '@/integrations/supabase/types';

export interface MealPlanMeal {
  recipeId: string;
  title: string;
  calories: number;
  imageUrl: string | null;
  prepTime: number | null;
}

export interface MealPlanDay {
  date: string;
  breakfast: MealPlanMeal | null;
  lunch: MealPlanMeal | null;
  dinner: MealPlanMeal | null;
}

export interface MealPlan {
  id: string;
  title: string;
  duration_days: number;
  meals: MealPlanDay[];
  total_cost: number | null;
  total_savings: number | null;
  created_at: string;
}

export function useMealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchMealPlans();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMealPlans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPlans: MealPlan[] = (data || []).map(plan => ({
        id: plan.id,
        title: plan.title,
        duration_days: plan.duration_days,
        meals: (plan.meals as unknown as MealPlanDay[]) || [],
        total_cost: plan.total_cost,
        total_savings: plan.total_savings,
        created_at: plan.created_at || '',
      }));

      setMealPlans(formattedPlans);
      
      // Sæt nyeste plan som aktuel
      if (formattedPlans.length > 0) {
        setCurrentPlan(formattedPlans[0]);
      }
    } catch (err) {
      console.error('Fejl ved hentning af madplaner:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveMealPlan = async (plan: Omit<MealPlan, 'id' | 'created_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          title: plan.title,
          duration_days: plan.duration_days,
          meals: plan.meals as unknown as Json,
          total_cost: plan.total_cost,
          total_savings: plan.total_savings,
        })
        .select()
        .single();

      if (error) throw error;

      const newPlan: MealPlan = {
        id: data.id,
        title: data.title,
        duration_days: data.duration_days,
        meals: (data.meals as unknown as MealPlanDay[]) || [],
        total_cost: data.total_cost,
        total_savings: data.total_savings,
        created_at: data.created_at || '',
      };

      setMealPlans(prev => [newPlan, ...prev]);
      setCurrentPlan(newPlan);

      return newPlan;
    } catch (err) {
      console.error('Fejl ved gemning af madplan:', err);
      return null;
    }
  };

  return {
    mealPlans,
    currentPlan,
    loading,
    fetchMealPlans,
    saveMealPlan,
  };
}
