import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

/**
 * Hook to sync profile data from Supabase to the onboarding store
 * This ensures the local store reflects the database state when user logs in
 */
export function useProfileSync() {
  const { profile, user } = useAuthStore();
  const { updateData } = useOnboardingStore();

  useEffect(() => {
    if (!profile || !user) return;

    // Parse date of birth into day/month/year components
    let birthDay: number | null = null;
    let birthMonth: number | null = null;
    let birthYear: number | null = null;

    if (profile.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      birthDay = dob.getDate();
      birthMonth = dob.getMonth() + 1;
      birthYear = dob.getFullYear();
    }

    // Sync profile data to onboarding store
    updateData({
      fullName: profile.full_name || '',
      gender: profile.gender || '',
      dateOfBirth: profile.date_of_birth || '',
      birthDay,
      birthMonth,
      birthYear,
      heightCm: profile.height_cm ? Number(profile.height_cm) : null,
      weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
      activityLevel: profile.activity_level || '',
      dietaryGoal: profile.dietary_goal || '',
      peopleCount: profile.people_count || 1,
      dailyCalories: profile.daily_calories,
      dailyProtein: profile.daily_protein_target,
      dailyCarbs: profile.daily_carbs_target,
      dailyFat: profile.daily_fat_target,
    });
  }, [profile, user, updateData]);
}
