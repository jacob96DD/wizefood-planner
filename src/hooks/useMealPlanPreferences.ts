import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface FixedMeal {
  day: 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  meal: 'breakfast' | 'lunch' | 'dinner';
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealException {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  meal: 'breakfast' | 'lunch' | 'dinner';
  type: 'cheat_meal' | 'skip' | 'restaurant';
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ExtraCalories {
  description: string;
  calories_per_week: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanPreferences {
  id?: string;
  user_id?: string;
  cooking_style: 'daily' | 'meal_prep_2' | 'meal_prep_3' | 'meal_prep_4';
  skip_breakfast: boolean;
  skip_lunch: boolean;
  skip_dinner: boolean;
  fixed_meals: FixedMeal[];
  exceptions: MealException[];
  extra_calories: ExtraCalories[];
  weekday_max_cook_time: number;
  weekend_max_cook_time: number;
  meal_prep_time: number;
  generate_alternatives: number;
  max_weekly_budget: number;
}

const defaultPreferences: Omit<MealPlanPreferences, 'id' | 'user_id'> = {
  cooking_style: 'daily',
  skip_breakfast: false,
  skip_lunch: false,
  skip_dinner: false,
  fixed_meals: [],
  exceptions: [],
  extra_calories: [],
  weekday_max_cook_time: 30,
  weekend_max_cook_time: 60,
  meal_prep_time: 120,
  generate_alternatives: 0,
  max_weekly_budget: 800,
};

export function useMealPlanPreferences() {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<MealPlanPreferences>(defaultPreferences as MealPlanPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meal_plan_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          id: data.id,
          user_id: data.user_id,
          cooking_style: (data.cooking_style as MealPlanPreferences['cooking_style']) || 'daily',
          skip_breakfast: data.skip_breakfast ?? false,
          skip_lunch: data.skip_lunch ?? false,
          skip_dinner: data.skip_dinner ?? false,
          fixed_meals: (data.fixed_meals as unknown as FixedMeal[]) || [],
          exceptions: (data.exceptions as unknown as MealException[]) || [],
          extra_calories: (data.extra_calories as unknown as ExtraCalories[]) || [],
          weekday_max_cook_time: data.weekday_max_cook_time ?? 30,
          weekend_max_cook_time: data.weekend_max_cook_time ?? 60,
          meal_prep_time: data.meal_prep_time ?? 120,
          generate_alternatives: data.generate_alternatives ?? 0,
          max_weekly_budget: (data as any).max_weekly_budget ?? 800,
        });
      } else {
        setPreferences(defaultPreferences as MealPlanPreferences);
      }
    } catch (error) {
      console.error('Error fetching meal plan preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<MealPlanPreferences>) => {
    if (!user?.id) return false;

    try {
      setSaving(true);
      const merged = { ...preferences, ...newPreferences };
      const dataToSave = {
        user_id: user.id,
        cooking_style: merged.cooking_style,
        skip_breakfast: merged.skip_breakfast,
        skip_lunch: merged.skip_lunch,
        skip_dinner: merged.skip_dinner,
        fixed_meals: merged.fixed_meals as unknown as Record<string, unknown>[],
        exceptions: merged.exceptions as unknown as Record<string, unknown>[],
        extra_calories: merged.extra_calories as unknown as Record<string, unknown>[],
        weekday_max_cook_time: merged.weekday_max_cook_time,
        weekend_max_cook_time: merged.weekend_max_cook_time,
        meal_prep_time: merged.meal_prep_time,
        generate_alternatives: merged.generate_alternatives,
        max_weekly_budget: merged.max_weekly_budget,
      };

      const { error } = await supabase
        .from('meal_plan_preferences')
        .upsert(dataToSave as any, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...newPreferences }));
      return true;
    } catch (error) {
      console.error('Error saving meal plan preferences:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Calculate adjusted macros based on fixed meals and extra calories
  const calculateAdjustedMacros = (profile: {
    daily_calories?: number | null;
    daily_protein_target?: number | null;
    daily_carbs_target?: number | null;
    daily_fat_target?: number | null;
  }) => {
    const baseCalories = profile.daily_calories || 2000;
    const baseProtein = profile.daily_protein_target || 75;
    const baseCarbs = profile.daily_carbs_target || 250;
    const baseFat = profile.daily_fat_target || 65;

    // Subtract extra calories (weekly / 7)
    const extraCaloriesPerDay = preferences.extra_calories.reduce(
      (sum, item) => sum + (item.calories_per_week / 7),
      0
    );
    const extraProteinPerDay = preferences.extra_calories.reduce(
      (sum, item) => sum + (item.protein / 7),
      0
    );
    const extraCarbsPerDay = preferences.extra_calories.reduce(
      (sum, item) => sum + (item.carbs / 7),
      0
    );
    const extraFatPerDay = preferences.extra_calories.reduce(
      (sum, item) => sum + (item.fat / 7),
      0
    );

    // Subtract fixed meals (if "all" days, count as daily)
    const fixedCaloriesPerDay = preferences.fixed_meals.reduce((sum, meal) => {
      if (meal.day === 'all') return sum + meal.calories;
      return sum + (meal.calories / 7); // Single day = divide by 7
    }, 0);
    const fixedProteinPerDay = preferences.fixed_meals.reduce((sum, meal) => {
      if (meal.day === 'all') return sum + meal.protein;
      return sum + (meal.protein / 7);
    }, 0);
    const fixedCarbsPerDay = preferences.fixed_meals.reduce((sum, meal) => {
      if (meal.day === 'all') return sum + meal.carbs;
      return sum + (meal.carbs / 7);
    }, 0);
    const fixedFatPerDay = preferences.fixed_meals.reduce((sum, meal) => {
      if (meal.day === 'all') return sum + meal.fat;
      return sum + (meal.fat / 7);
    }, 0);

    return {
      availableCalories: Math.round(baseCalories - extraCaloriesPerDay - fixedCaloriesPerDay),
      availableProtein: Math.round(baseProtein - extraProteinPerDay - fixedProteinPerDay),
      availableCarbs: Math.round(baseCarbs - extraCarbsPerDay - fixedCarbsPerDay),
      availableFat: Math.round(baseFat - extraFatPerDay - fixedFatPerDay),
      extraCaloriesPerDay: Math.round(extraCaloriesPerDay),
      fixedCaloriesPerDay: Math.round(fixedCaloriesPerDay),
    };
  };

  return {
    preferences,
    loading,
    saving,
    fetchPreferences,
    savePreferences,
    calculateAdjustedMacros,
  };
}
