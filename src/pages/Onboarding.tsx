import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const dietaryGoals = [
  { value: 'lose', icon: '📉' },
  { value: 'maintain', icon: '⚖️' },
  { value: 'gain', icon: '📈' },
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

  // Goal adjustment
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

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentStep, data, nextStep, prevStep, updateData, reset } = useOnboardingStore();
  const { user, setIsOnboarded, setProfile } = useAuthStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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

      // Calculate macros
      const macros = calculateMacros(
        data.weightKg!,
        data.heightCm!,
        age,
        data.gender,
        data.activityLevel,
        data.dietaryGoal
      );

      // Update profile in Supabase
      const profileData = {
        id: user.id,
        full_name: data.fullName,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        age_years: age,
        activity_level: data.activityLevel,
        dietary_goal: data.dietaryGoal,
        budget_per_week: data.budgetPerWeek,
        people_count: data.peopleCount,
        daily_calories: macros.dailyCalories,
        daily_protein_target: macros.dailyProtein,
        daily_carbs_target: macros.dailyCarbs,
        daily_fat_target: macros.dailyFat,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.fullName && data.gender && data.dateOfBirth;
      case 2:
        return data.heightCm && data.weightKg;
      case 3:
        return data.activityLevel;
      case 4:
        return data.dietaryGoal;
      case 5:
        return data.budgetPerWeek !== null && data.peopleCount > 0;
      case 6:
        return true; // Allergens are optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
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
                <Input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={(e) => updateData({ dateOfBirth: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 2:
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

      case 3:
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

      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎯</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.goal.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.goal.subtitle')}</p>
            </div>

            <div className="space-y-3">
              {dietaryGoals.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => updateData({ dietaryGoal: goal.value })}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                    data.dietaryGoal === goal.value
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <p className="font-medium">{t(`onboarding.goals.${goal.value}.label`)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`onboarding.goals.${goal.value}.description`)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">💰</span>
              <h2 className="text-2xl font-bold mb-2">{t('onboarding.budgetHousehold.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.budgetHousehold.subtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('onboarding.weeklyBudget')}</label>
                <Input
                  type="number"
                  placeholder={t('onboarding.budgetPlaceholder')}
                  value={data.budgetPerWeek || ''}
                  onChange={(e) => updateData({ budgetPerWeek: Number(e.target.value) || null })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t('onboarding.householdSize')}</label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateData({ peopleCount: Math.max(1, data.peopleCount - 1) })}
                  >
                    -
                  </Button>
                  <span className="text-3xl font-bold w-16 text-center">{data.peopleCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateData({ peopleCount: data.peopleCount + 1 })}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
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

            <p className="text-sm text-muted-foreground text-center">
              {t('onboarding.allergies.skipNote')}
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
          style={{ width: `${(currentStep / 6) * 100}%` }}
        />
      </div>

      {/* Centered container for desktop */}
      <div className="flex-1 flex flex-col w-full max-w-xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-6 md:pt-10">
          {currentStep > 1 ? (
            <Button variant="ghost" size="icon" onClick={prevStep} className="hover:bg-secondary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
          <span className="text-sm text-muted-foreground">
            {t('common.step')} {currentStep} {t('common.of')} 6
          </span>
          <div className="w-10" />
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-4 md:py-8 overflow-y-auto">
          {renderStep()}
        </main>

        {/* Footer */}
        <footer className="p-6 md:pb-10 safe-bottom">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={currentStep === 6 ? handleComplete : nextStep}
            disabled={!canProceed() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('onboarding.saving')}</span>
              </>
            ) : currentStep === 6 ? (
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
