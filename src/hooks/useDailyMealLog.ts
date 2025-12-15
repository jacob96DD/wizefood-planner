import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface FoodPhoto {
  url: string;
  description?: string;
  estimated_calories?: number;
  timestamp: string;
}

export interface DailyMealLog {
  id: string;
  user_id: string;
  date: string;
  meal_plan_id: string | null;
  breakfast_completed: boolean;
  lunch_completed: boolean;
  dinner_completed: boolean;
  breakfast_skipped: boolean;
  lunch_skipped: boolean;
  dinner_skipped: boolean;
  food_photos: FoodPhoto[];
  extra_calories: number;
  extra_description: string | null;
}

export function useDailyMealLog(date: string) {
  const [log, setLog] = useState<DailyMealLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const fetchLog = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_meal_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLog({
          ...data,
          food_photos: (data.food_photos as unknown as FoodPhoto[]) || [],
        });
      } else {
        setLog(null);
      }
    } catch (err) {
      console.error('Error fetching daily meal log:', err);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const upsertLog = async (updates: Partial<DailyMealLog>) => {
    if (!user) return null;

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        date,
        ...updates,
      };
      
      const { data, error } = await supabase
        .from('daily_meal_log')
        .upsert(payload as any, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;

      const newLog = {
        ...data,
        food_photos: (data.food_photos as unknown as FoodPhoto[]) || [],
      };
      setLog(newLog);
      return newLog;
    } catch (err) {
      console.error('Error updating daily meal log:', err);
      toast({
        title: 'Fejl',
        description: 'Kunne ikke gemme ændringer',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const toggleMealCompleted = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const currentValue = log?.[`${mealType}_completed`] ?? false;
    await upsertLog({
      [`${mealType}_completed`]: !currentValue,
      [`${mealType}_skipped`]: false, // Unset skipped when completing
    });
  };

  const toggleMealSkipped = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const currentValue = log?.[`${mealType}_skipped`] ?? false;
    await upsertLog({
      [`${mealType}_skipped`]: !currentValue,
      [`${mealType}_completed`]: false, // Unset completed when skipping
    });
  };

  const addFoodPhoto = async (photo: FoodPhoto) => {
    const currentPhotos = log?.food_photos || [];
    await upsertLog({
      food_photos: [...currentPhotos, photo] as any,
    });
  };

  const updateExtraCalories = async (calories: number, description?: string) => {
    await upsertLog({
      extra_calories: calories,
      extra_description: description || null,
    });
  };

  return {
    log,
    loading,
    saving,
    toggleMealCompleted,
    toggleMealSkipped,
    addFoodPhoto,
    updateExtraCalories,
    refetch: fetchLog,
  };
}
