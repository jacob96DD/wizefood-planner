import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const genderOptions = [
  { value: 'male', label: 'Mand', icon: '👨' },
  { value: 'female', label: 'Kvinde', icon: '👩' },
  { value: 'other', label: 'Andet', icon: '🧑' },
];

const activityLevels = [
  { value: 'sedentary', label: 'Stillesiddende', description: 'Lidt eller ingen motion', icon: '🪑' },
  { value: 'light', label: 'Let aktiv', description: 'Let motion 1-3 dage/uge', icon: '🚶' },
  { value: 'moderate', label: 'Moderat aktiv', description: 'Moderat motion 3-5 dage/uge', icon: '🏃' },
  { value: 'active', label: 'Meget aktiv', description: 'Hård motion 6-7 dage/uge', icon: '💪' },
  { value: 'athlete', label: 'Atlet', description: 'Meget hård træning', icon: '🏆' },
];

const dietaryGoals = [
  { value: 'lose', label: 'Tab vægt', description: 'Spis under dit kaloriebehov', icon: '📉' },
  { value: 'maintain', label: 'Vedligehold', description: 'Hold din nuværende vægt', icon: '⚖️' },
  { value: 'gain', label: 'Byg muskler', description: 'Spis over dit kaloriebehov', icon: '📈' },
];

const allergens = [
  { id: 'gluten', name: 'Gluten', icon: '🌾' },
  { id: 'dairy', name: 'Mælk', icon: '🥛' },
  { id: 'eggs', name: 'Æg', icon: '🥚' },
  { id: 'nuts', name: 'Nødder', icon: '🥜' },
  { id: 'fish', name: 'Fisk', icon: '🐟' },
  { id: 'shellfish', name: 'Skaldyr', icon: '🦐' },
  { id: 'soy', name: 'Soja', icon: '🫘' },
  { id: 'celery', name: 'Selleri', icon: '🥬' },
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
  const { currentStep, data, nextStep, prevStep, updateData, reset } = useOnboardingStore();
  const { user, setIsOnboarded, setProfile } = useAuthStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    if (!user) {
      toast({
        title: 'Fejl',
        description: 'Du skal være logget ind for at fortsætte.',
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

        const userAllergens = data.selectedAllergens
          .map(allergenId => {
            // Find matching allergen in database
            const allergenName = allergens.find(a => a.id === allergenId)?.name.toLowerCase();
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
        title: 'Profil gemt!',
        description: 'Din profil er nu oprettet. Lad os finde nogle opskrifter!',
      });

      navigate('/home');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Fejl',
        description: 'Der opstod en fejl ved gemning af din profil. Prøv igen.',
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
              <h2 className="text-2xl font-bold mb-2">Velkommen til WizeFood!</h2>
              <p className="text-muted-foreground">Lad os lære dig at kende</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Dit navn</label>
                <Input
                  placeholder="Indtast dit navn"
                  value={data.fullName}
                  onChange={(e) => updateData({ fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Køn</label>
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
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Fødselsdato</label>
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
              <h2 className="text-2xl font-bold mb-2">Fysiske mål</h2>
              <p className="text-muted-foreground">Vi bruger dette til at beregne dit kaloriebehov</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Højde (cm)</label>
                <Input
                  type="number"
                  placeholder="f.eks. 175"
                  value={data.heightCm || ''}
                  onChange={(e) => updateData({ heightCm: Number(e.target.value) || null })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Vægt (kg)</label>
                <Input
                  type="number"
                  placeholder="f.eks. 70"
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
              <h2 className="text-2xl font-bold mb-2">Aktivitetsniveau</h2>
              <p className="text-muted-foreground">Hvor aktiv er du i hverdagen?</p>
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
                    <p className="font-medium">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
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
              <h2 className="text-2xl font-bold mb-2">Dit mål</h2>
              <p className="text-muted-foreground">Hvad vil du gerne opnå?</p>
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
                    <p className="font-medium">{goal.label}</p>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
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
              <h2 className="text-2xl font-bold mb-2">Budget og husstand</h2>
              <p className="text-muted-foreground">Hvor meget vil du bruge på mad om ugen?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ugentligt madbudget (kr)</label>
                <Input
                  type="number"
                  placeholder="f.eks. 800"
                  value={data.budgetPerWeek || ''}
                  onChange={(e) => updateData({ budgetPerWeek: Number(e.target.value) || null })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Antal personer i husstanden</label>
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
              <h2 className="text-2xl font-bold mb-2">Allergier og intoleranser</h2>
              <p className="text-muted-foreground">Vælg de fødevarer du skal undgå</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {allergens.map((allergen) => {
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
                    <span className="font-medium">{allergen.name}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Du kan springe dette trin over hvis du ikke har allergier
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

      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-6">
        {currentStep > 1 ? (
          <Button variant="ghost" size="icon" onClick={prevStep}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <span className="text-sm text-muted-foreground">Trin {currentStep} af 6</span>
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-4 overflow-y-auto">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="p-6 safe-bottom">
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
              <span>Gemmer...</span>
            </>
          ) : currentStep === 6 ? (
            <>
              <Check className="w-5 h-5" />
              <span>Kom i gang</span>
            </>
          ) : (
            <>
              <span>Fortsæt</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
