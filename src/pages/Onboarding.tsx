import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboardingStore, HouseholdMember } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LanguageFlagSelector } from '@/components/LanguageFlagSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const genderOptions = [
  { value: 'male', icon: '👨' },
  { value: 'female', icon: '👩' },
  { value: 'other', icon: '🧑' },
];

const activityLevels = [
  { value: 'sedentary', icon: '🪑' },
  { value: 'light', icon: '🚶' },
  { value: 'moderate', icon: '🏃' },
  { value: 'active', icon: '💪' },
  { value: 'athlete', icon: '🏆' },
];

// Body goals are mutually exclusive
const bodyGoals = [
  { value: 'lose', icon: '📉' },
  { value: 'maintain', icon: '⚖️' },
  { value: 'gain', icon: '📈' },
];

// Lifestyle goals can be combined with body goals
const lifestyleGoals = [
  { value: 'save_money', icon: '💰' },
  { value: 'save_time', icon: '⏰' },
];

const allergensList = [
  { id: 'gluten', icon: '🌾' },
  { id: 'dairy', icon: '🥛' },
  { id: 'eggs', icon: '🥚' },
  { id: 'nuts', icon: '🥜' },
  { id: 'fish', icon: '🐟' },
  { id: 'shellfish', icon: '🦐' },
  { id: 'soy', icon: '🫘' },
  { id: 'celery', icon: '🥬' },
];

const dislikeOptions = [
  { id: 'risalamande', icon: '🍚' },
  { id: 'leverpostej', icon: '🍞' },
  { id: 'fisk', icon: '🐟' },
  { id: 'indmad', icon: '🫀' },
  { id: 'svampe', icon: '🍄' },
  { id: 'oliven', icon: '🫒' },
  { id: 'blodpudding', icon: '🩸' },
  { id: 'ost', icon: '🧀' },
  { id: 'skaldyr', icon: '🦐' },
  { id: 'spidskommen', icon: '🌿' },
  { id: 'koriander', icon: '🌿' },
  { id: 'aubergine', icon: '🍆' },
  { id: 'rosenkaal', icon: '🥬' },
  { id: 'ananas', icon: '🍕' },
  { id: 'lever', icon: '🫀' },
];

// Calculate calories using Mifflin-St Jeor formula
function calculateMacros(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string,
  goal: string
) {
  // BMR calculation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

  // Goal adjustment - save_money and save_time use maintain calories
  let calories: number;
  if (goal === 'lose') {
    calories = tdee - 500;
  } else if (goal === 'gain') {
    calories = tdee + 300;
  } else {
    calories = tdee;
  }

  // Macro distribution
  const protein = Math.round((calories * 0.3) / 4); // 30% protein, 4 cal/g
  const fat = Math.round((calories * 0.25) / 9); // 25% fat, 9 cal/g
  const carbs = Math.round((calories * 0.45) / 4); // 45% carbs, 4 cal/g

  return {
    dailyCalories: Math.round(calories),
    dailyProtein: protein,
    dailyFat: fat,
    dailyCarbs: carbs,
  };
}

// Calculate macros for household member (simplified - no activity level, use moderate by default)
function calculateMemberMacros(member: HouseholdMember, goal: string) {
  if (!member.weightKg || !member.heightCm || !member.ageYears) {
    return null;
  }
  return calculateMacros(
    member.weightKg,
    member.heightCm,
    member.ageYears,
    member.gender || 'other',
    'moderate',
    goal
  );
}

// Generate days array for dropdown
const days = Array.from({ length: 31 }, (_, i) => i + 1);

// Generate years array (from current year - 100 to current year - 10)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 91 }, (_, i) => currentYear - 10 - i);

const TOTAL_STEPS = 8;

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentStep, data, nextStep, prevStep, updateData, updateHouseholdMember, initializeHouseholdMembers, reset, setStep } = useOnboardingStore();
  const { user, setIsOnboarded, setProfile } = useAuthStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // Month names for dropdown
  const months = [
    { value: 1, label: t('onboarding.months.january') },
    { value: 2, label: t('onboarding.months.february') },
    { value: 3, label: t('onboarding.months.march') },
    { value: 4, label: t('onboarding.months.april') },
    { value: 5, label: t('onboarding.months.may') },
    { value: 6, label: t('onboarding.months.june') },
    { value: 7, label: t('onboarding.months.july') },
    { value: 8, label: t('onboarding.months.august') },
    { value: 9, label: t('onboarding.months.september') },
    { value: 10, label: t('onboarding.months.october') },
    { value: 11, label: t('onboarding.months.november') },
    { value: 12, label: t('onboarding.months.december') },
  ];

  // Get days in selected month
  const getDaysInMonth = (month: number | null, year: number | null) => {
    if (!month || !year) return 31;
    return new Date(year, month, 0).getDate();
  };

  const maxDays = getDaysInMonth(data.birthMonth, data.birthYear);

  // Update dateOfBirth when day/month/year changes
  useEffect(() => {
    if (data.birthDay && data.birthMonth && data.birthYear) {
      const formattedMonth = data.birthMonth.toString().padStart(2, '0');
      const formattedDay = data.birthDay.toString().padStart(2, '0');
      const dateString = `${data.birthYear}-${formattedMonth}-${formattedDay}`;
      updateData({ dateOfBirth: dateString });
    }
  }, [data.birthDay, data.birthMonth, data.birthYear, updateData]);

  // Initialize household members when peopleCount changes (for future use)
  useEffect(() => {
    initializeHouseholdMembers(data.peopleCount);
  }, [data.peopleCount, initializeHouseholdMembers]);

  // Handle goal selection with mutual exclusivity for body goals
  const handleGoalClick = (goalValue: string, isBodyGoal: boolean) => {
    let newGoals = [...data.dietaryGoals];
    
    if (isBodyGoal) {
      // Remove any existing body goals
      newGoals = newGoals.filter(g => !bodyGoals.some(bg => bg.value === g));
      // Add the new body goal
      newGoals.push(goalValue);
      // Update primary body goal for macro calculation
      updateData({ dietaryGoals: newGoals, dietaryGoal: goalValue });
    } else {
      // Toggle lifestyle goal
      if (newGoals.includes(goalValue)) {
        newGoals = newGoals.filter(g => g !== goalValue);
      } else {
        newGoals.push(goalValue);
      }
      updateData({ dietaryGoals: newGoals });
    }
  };

  // Toggle disliked food
  const handleDislikeToggle = (foodId: string) => {
    const newDislikes = data.dislikedFoods.includes(foodId)
      ? data.dislikedFoods.filter(f => f !== foodId)
      : [...data.dislikedFoods, foodId];
    updateData({ dislikedFoods: newDislikes });
  };

  // Skip current step (go to next without filling data)
  const handleSkipStep = () => {
    nextStep();
  };

  // Skip onboarding - create minimal profile focused on saving money
  const handleSkipOnboarding = async () => {
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('onboarding.mustBeLoggedIn'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsSaving(true);

    try {
      // Create minimal profile with "save money" as primary goal
      const profileData = {
        id: user.id,
        full_name: 'Bruger',
        dietary_goal: 'save_money',
        people_count: 1,
        // Use average Danish adult values
        daily_calories: 2000,
        daily_protein_target: 75,
        daily_carbs_target: 250,
        daily_fat_target: 65,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      // Update local state
      setProfile(updatedProfile);
      setIsOnboarded(true);
      reset();

      toast({
        title: '💰 ' + t('onboarding.skipSuccess', 'Klar til at spare!'),
        description: t('onboarding.skipSuccessDesc', 'Vi genererer madplaner baseret på tilbud.'),
      });

      navigate('/home');
    } catch (error: any) {
      console.error('Error skipping onboarding:', error);
      toast({
        title: t('common.error'),
        description: t('onboarding.errorSaving'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('onboarding.mustBeLoggedIn'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsSaving(true);

    try {
      // Calculate age from date of birth
      const birthDate = new Date(data.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Use primary body goal for macro calculation
      const primaryGoal = data.dietaryGoal || 'maintain';

      // Calculate macros for primary user
      const macros = calculateMacros(
        data.weightKg!,
        data.heightCm!,
        age,
        data.gender,
        data.activityLevel,
        primaryGoal
      );

      // Calculate combined macros for household
      let totalCalories = macros.dailyCalories;
      let totalProtein = macros.dailyProtein;
      let totalCarbs = macros.dailyCarbs;
      let totalFat = macros.dailyFat;

      // Add household member macros
      for (const member of data.householdMembers) {
        const memberMacros = calculateMemberMacros(member, primaryGoal);
        if (memberMacros) {
          totalCalories += memberMacros.dailyCalories;
          totalProtein += memberMacros.dailyProtein;
          totalCarbs += memberMacros.dailyCarbs;
          totalFat += memberMacros.dailyFat;
        }
      }

      // Update profile in Supabase - store all selected goals as JSON array string
      const profileData = {
        id: user.id,
        full_name: data.fullName,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        age_years: age,
        activity_level: data.activityLevel,
        dietary_goal: primaryGoal, // Keep primary goal for backwards compatibility
        budget_per_week: null,
        people_count: data.peopleCount,
        daily_calories: totalCalories,
        daily_protein_target: totalProtein,
        daily_carbs_target: totalCarbs,
        daily_fat_target: totalFat,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      // Save household members to database
      if (data.householdMembers.length > 0) {
        // Delete existing household members
        await supabase
          .from('household_members')
          .delete()
          .eq('user_id', user.id);

        // Insert new household members
        const membersToInsert = data.householdMembers.map((member) => {
          const memberMacros = calculateMemberMacros(member, primaryGoal);
          return {
            user_id: user.id,
            name: member.name || `Person ${data.householdMembers.indexOf(member) + 2}`,
            gender: member.gender || null,
            age_years: member.ageYears,
            height_cm: member.heightCm,
            weight_kg: member.weightKg,
            daily_calories: memberMacros?.dailyCalories || null,
            daily_protein_target: memberMacros?.dailyProtein || null,
            daily_carbs_target: memberMacros?.dailyCarbs || null,
            daily_fat_target: memberMacros?.dailyFat || null,
          };
        });

        const { error: membersError } = await supabase
          .from('household_members')
          .insert(membersToInsert);

        if (membersError) {
          console.error('Error saving household members:', membersError);
        }
      }

      // First, get allergen IDs from the database
      const { data: allergenData, error: allergenFetchError } = await supabase
        .from('allergens')
        .select('id, name');

      if (allergenFetchError) throw allergenFetchError;

      // Delete existing user allergens
      await supabase
        .from('user_allergens')
        .delete()
        .eq('user_id', user.id);

      // Insert new user allergens
      if (data.selectedAllergens.length > 0 && allergenData) {
        // Map allergen names to database IDs
        const allergenMap: Record<string, string> = {};
        allergenData.forEach(a => {
          allergenMap[a.name.toLowerCase()] = a.id;
        });

        const allergenNameMap: Record<string, string> = {
          gluten: 'gluten',
          dairy: 'mælk',
          eggs: 'æg',
          nuts: 'nødder',
          fish: 'fisk',
          shellfish: 'skaldyr',
          soy: 'soja',
          celery: 'selleri',
        };

        const userAllergens = data.selectedAllergens
          .map(allergenId => {
            const allergenName = allergenNameMap[allergenId];
            const dbAllergenId = allergenName ? allergenMap[allergenName] : null;
            
            if (dbAllergenId) {
              return {
                user_id: user.id,
                allergen_id: dbAllergenId,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (userAllergens.length > 0) {
          const { error: allergenError } = await supabase
            .from('user_allergens')
            .insert(userAllergens);

          if (allergenError) {
            console.error('Error saving allergens:', allergenError);
          }
        }
      }

      // Save food dislikes
      // First delete existing dislikes
      await supabase
        .from('user_food_dislikes')
        .delete()
        .eq('user_id', user.id);

      // Get all dislikes to save (selected + custom)
      const allDislikes = [...data.dislikedFoods];
      if (data.customDislikes) {
        const customItems = data.customDislikes.split(',').map(s => s.trim()).filter(Boolean);
        allDislikes.push(...customItems);
      }

      if (allDislikes.length > 0) {
        const dislikesToInsert = allDislikes.map((food) => ({
          user_id: user.id,
          food_name: food,
        }));

        const { error: dislikesError } = await supabase
          .from('user_food_dislikes')
          .insert(dislikesToInsert);

        if (dislikesError) {
          console.error('Error saving food dislikes:', dislikesError);
        }
      }

      // Update local state
      setProfile(updatedProfile);
      setIsOnboarded(true);
      reset();

      toast({
        title: t('onboarding.profileSaved'),
        description: t('onboarding.profileSavedDesc'),
      });

      navigate('/home');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common.error'),
        description: t('onboarding.errorSaving'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // New step order:
  // 1: Meal plan size (fixed to 1)
  // 2: Personal info (name, gender, birth date with dropdowns)
  // 3: Physical measurements (height, weight)
  // 4: Activity level
  // 5: Goals (multi-select with rules)
  // 6: Allergies (with custom input)
  // 7: Food dislikes
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.peopleCount > 0;
      case 2:
        // Can proceed even if skipped (allow skip)
        return true;
      case 3:
        // Can proceed even if skipped (allow skip)
        return true;
      case 4:
        // Can proceed even if skipped (allow skip)
        return true;
      case 5:
        // Can proceed even if skipped (allow skip)
        return true;
      case 6:
        return true; // Allergens are optional
      case 7:
        return true; // Dislikes are optional
      case 8:
        return true; // Stores are optional
      default:
        return false;
    }
  };

  // Check if current step has required data filled
  const hasStepData = () => {
    switch (currentStep) {
      case 2:
        return data.fullName && data.gender && data.birthDay && data.birthMonth && data.birthYear;
      case 3:
        return data.heightCm && data.weightKg;
      case 4:
        return data.activityLevel;
      case 5:
        return data.dietaryGoals.some(g => bodyGoals.some(bg => bg.value === g));
      default:
        return true;
    }
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrev = () => {
    prevStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Meal plan size (Step 1)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🍽️</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.mealPlanSize.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.mealPlanSize.subtitle')}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">{t('onboarding.mealPlanSize.label')}</label>
              <div className="flex items-center justify-center">
                <span className="text-6xl font-bold text-primary">1</span>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t('onboarding.mealPlanSize.comingSoon')}
              </p>
            </div>
          </div>
        );

      case 2:
        // Personal info (Step 2)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">👋</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.welcome.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.welcome.subtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('onboarding.yourName')}</label>
                <Input
                  placeholder={t('onboarding.enterName')}
                  value={data.fullName}
                  onChange={(e) => updateData({ fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t('onboarding.gender')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {genderOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateData({ gender: option.value })}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        data.gender === option.value
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-sm font-medium">
                        {t(`onboarding.genders.${option.value}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('onboarding.birthDate')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day dropdown */}
                  <Select
                    value={data.birthDay?.toString() || ''}
                    onValueChange={(value) => updateData({ birthDay: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.birthDateDay')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border max-h-60">
                      {days.filter(d => d <= maxDays).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Month dropdown */}
                  <Select
                    value={data.birthMonth?.toString() || ''}
                    onValueChange={(value) => updateData({ birthMonth: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.birthDateMonth')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border max-h-60">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Year dropdown */}
                  <Select
                    value={data.birthYear?.toString() || ''}
                    onValueChange={(value) => updateData({ birthYear: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.birthDateYear')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border max-h-60">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        // Physical measurements (Step 3)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">📏</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.physicalMeasurements.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.physicalMeasurements.subtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('onboarding.height')}</label>
                <Input
                  type="number"
                  placeholder={t('onboarding.heightPlaceholder')}
                  value={data.heightCm || ''}
                  onChange={(e) => updateData({ heightCm: Number(e.target.value) || null })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('onboarding.weight')}</label>
                <Input
                  type="number"
                  placeholder={t('onboarding.weightPlaceholder')}
                  value={data.weightKg || ''}
                  onChange={(e) => updateData({ weightKg: Number(e.target.value) || null })}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        // Activity level (Step 4)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🏃</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.activityLevel.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.activityLevel.subtitle')}</p>
            </div>

            <div className="space-y-3">
              {activityLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => updateData({ activityLevel: level.value })}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                    data.activityLevel === level.value
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <p className="font-medium">{t(`onboarding.activities.${level.value}.label`)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`onboarding.activities.${level.value}.description`)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        // Goals (Step 5) - Multi-select with rules
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎯</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.goal.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.goal.subtitle')}</p>
            </div>

            {/* Body goals - mutually exclusive */}
            <div>
              <label className="text-sm font-medium mb-3 block text-muted-foreground">
                {t('onboarding.goal.bodyGoalsLabel')}
              </label>
              <div className="space-y-3">
                {bodyGoals.map((goal) => {
                  const isSelected = data.dietaryGoals.includes(goal.value);
                  return (
                    <button
                      key={goal.value}
                      onClick={() => handleGoalClick(goal.value, true)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{goal.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{t(`onboarding.goals.${goal.value}.label`)}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`onboarding.goals.${goal.value}.description`)}
                        </p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lifestyle goals - can be combined */}
            <div>
              <label className="text-sm font-medium mb-3 block text-muted-foreground">
                {t('onboarding.goal.lifestyleGoalsLabel')}
              </label>
              <div className="space-y-3">
                {lifestyleGoals.map((goal) => {
                  const isSelected = data.dietaryGoals.includes(goal.value);
                  return (
                    <button
                      key={goal.value}
                      onClick={() => handleGoalClick(goal.value, false)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{goal.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{t(`onboarding.goals.${goal.value}.label`)}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`onboarding.goals.${goal.value}.description`)}
                        </p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 6:
        // Allergies (Step 6) - with custom input
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">⚠️</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.allergies.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.allergies.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {allergensList.map((allergen) => {
                const isSelected = data.selectedAllergens.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    onClick={() => {
                      if (isSelected) {
                        updateData({
                          selectedAllergens: data.selectedAllergens.filter((a) => a !== allergen.id),
                        });
                      } else {
                        updateData({
                          selectedAllergens: [...data.selectedAllergens, allergen.id],
                        });
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{allergen.icon}</span>
                    <span className="font-medium">{t(`onboarding.allergens.${allergen.id}`)}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Custom allergen input */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('onboarding.allergies.customLabel')}</label>
              <Input
                placeholder={t('onboarding.allergies.customPlaceholder')}
                value={data.customAllergens}
                onChange={(e) => updateData({ customAllergens: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('onboarding.allergies.customHint')}
              </p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t('onboarding.allergies.skipNote')}
            </p>
          </div>
        );

      case 7:
        // Food dislikes (Step 7)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🙅</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.dislikes.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.dislikes.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {dislikeOptions.map((food) => {
                const isSelected = data.dislikedFoods.includes(food.id);
                return (
                  <button
                    key={food.id}
                    onClick={() => handleDislikeToggle(food.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-destructive bg-destructive/10"
                        : "border-border hover:border-destructive/50"
                    )}
                  >
                    <span className="text-2xl">{food.icon}</span>
                    <span className="font-medium text-sm">{t(`onboarding.dislikes.${food.id}`)}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-destructive" />}
                  </button>
                );
              })}
            </div>

            {/* Custom dislikes input */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('onboarding.dislikes.customLabel')}</label>
              <Input
                placeholder={t('onboarding.dislikes.customPlaceholder')}
                value={data.customDislikes}
                onChange={(e) => updateData({ customDislikes: e.target.value })}
              />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t('onboarding.dislikes.skipNote')}
            </p>
          </div>
        );

      case 8:
        // Preferred stores (Step 8)
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🛒</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.stores.title', 'Foretrukne butikker')}</h2>
              <p className="text-muted-foreground">{t('onboarding.stores.subtitle', 'Hvilke butikker handler du typisk i?')}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t('onboarding.stores.note', 'Du kan ændre dette senere i profilen under "Foretrukne butikker".')}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-gradient-primary transition-all duration-300"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Centered container for desktop */}
      <div className="flex-1 flex flex-col w-full max-w-xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-6 md:pt-10">
          <div className="flex items-center gap-2">
            {currentStep > 1 ? (
              <Button variant="ghost" size="icon" onClick={handlePrev} className="hover:bg-secondary">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10" />
            )}
            <LanguageFlagSelector compact />
          </div>
          <span className="text-sm text-muted-foreground">
            {t('common.step')} {currentStep} {t('common.of')} {TOTAL_STEPS}
          </span>
          
          {/* Skip button */}
          <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                <Zap className="w-3 h-3 mr-1" />
                {t('onboarding.skipAll', 'Spring over')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  {t('onboarding.skipTitle', 'Bare billige madplaner?')}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    {t('onboarding.skipDescription', 'Hvis du bare vil have billige madplaner baseret på tilbud, kan du springe onboarding over.')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.skipNote2', 'Du kan altid tilføje dine præferencer senere i profilen.')}
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel', 'Annuller')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleSkipOnboarding} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {t('onboarding.skipConfirm', 'Giv mig billige retter!')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-4 md:py-8 overflow-y-auto">
          {renderStep()}
        </main>

        {/* Footer */}
        <footer className="p-6 md:pb-10 safe-bottom space-y-3">
          {/* Skip step button - show on steps 2-7 when data is not filled */}
          {currentStep > 1 && currentStep <= TOTAL_STEPS && !hasStepData() && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkipStep}
            >
              {t('onboarding.skipStep')}
            </Button>
          )}
          
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
            disabled={!canProceed() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('onboarding.saving')}</span>
              </>
            ) : currentStep === TOTAL_STEPS ? (
              <>
                <Check className="w-5 h-5" />
                <span>{t('onboarding.getStarted')}</span>
              </>
            ) : (
              <>
                <span>{t('common.continue')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </footer>
      </div>
    </div>
  );
}
