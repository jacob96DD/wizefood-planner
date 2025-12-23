import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Settings, LogOut, ChevronRight, Target, Users, AlertTriangle, Edit2, Globe, Store, TrendingUp, ThumbsDown, Pizza, Package, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LanguageSelector } from '@/components/LanguageSelector';
import { EditMacrosDialog } from '@/components/EditMacrosDialog';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { EditAllergiesDialog } from '@/components/EditAllergiesDialog';
import { EditDislikesDialog } from '@/components/EditDislikesDialog';
import { EditRealLifeCaloriesDialog } from '@/components/EditRealLifeCaloriesDialog';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout, setProfile } = useAuthStore();
  const { data, updateData } = useOnboardingStore();
  const [macrosDialogOpen, setMacrosDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [allergiesDialogOpen, setAllergiesDialogOpen] = useState(false);
  const [dislikesDialogOpen, setDislikesDialogOpen] = useState(false);
  const [realLifeDialogOpen, setRealLifeDialogOpen] = useState(false);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [preferredStoresCount, setPreferredStoresCount] = useState<number>(0);
  const [allergiesCount, setAllergiesCount] = useState<number>(0);
  const [dislikesCount, setDislikesCount] = useState<number>(0);
  
  // Real-life calories state
  const [realLifeDescription, setRealLifeDescription] = useState<string | null>(null);
  const [realLifeCaloriesPerWeek, setRealLifeCaloriesPerWeek] = useState<number | null>(null);
  const [realLifeProtein, setRealLifeProtein] = useState<number | null>(null);
  const [realLifeCarbs, setRealLifeCarbs] = useState<number | null>(null);
  const [realLifeFat, setRealLifeFat] = useState<number | null>(null);

  // Sync profile from database to store
  useProfileSync();

  // Get inventory data
  const { items: inventoryItems, expiringItems } = useInventory();

  // Fetch latest progress entry and preferred stores count
  useEffect(() => {
    if (!user) return;
    
    // Fetch latest weight
    supabase
      .from('user_progress')
      .select('weight_kg')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.weight_kg) {
          setLatestWeight(Number(data.weight_kg));
        }
      });

    // Fetch preferred stores count
    supabase
      .from('user_preferred_chains')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        setPreferredStoresCount(count || 0);
      });

    // Fetch allergies count
    supabase
      .from('user_allergens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        setAllergiesCount(count || 0);
      });

    // Fetch dislikes count
    supabase
      .from('user_food_dislikes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        setDislikesCount(count || 0);
      });

    // Fetch real-life calories from profile
    supabase
      .from('profiles')
      .select('real_life_description, real_life_calories_per_week, real_life_protein_per_week, real_life_carbs_per_week, real_life_fat_per_week')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRealLifeDescription(data.real_life_description);
          setRealLifeCaloriesPerWeek(data.real_life_calories_per_week);
          setRealLifeProtein(data.real_life_protein_per_week);
          setRealLifeCarbs(data.real_life_carbs_per_week);
          setRealLifeFat(data.real_life_fat_per_week);
        }
      });
  }, [user, allergiesDialogOpen, dislikesDialogOpen, realLifeDialogOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Calculate daily calorie needs using Mifflin-St Jeor formula with dynamic macro distribution
  const calculateMacros = () => {
    if (!data.weightKg || !data.heightCm || !data.dateOfBirth) {
      return { calories: 2000, protein: 125, carbs: 225, fat: 67 };
    }
    
    const age = new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear();
    
    // Mifflin-St Jeor BMR formula (mest præcis for moderne befolkninger)
    const bmr = data.gender === 'male'
      ? (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * age) + 5
      : (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * age) - 161;

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      athlete: 1.9,
    };

    // TDEE = BMR × activity factor
    const multiplier = activityMultipliers[data.activityLevel] || 1.55;
    let calories = Math.round(bmr * multiplier);

    // Adjust for goal (±500 kcal for ~0.5 kg/week)
    if (data.dietaryGoal === 'lose') calories -= 500;
    if (data.dietaryGoal === 'gain') calories += 500;

    // Dynamic macro distribution based on dietary goal
    let proteinRatio = 0.25;
    let carbsRatio = 0.45;
    let fatRatio = 0.30;

    if (data.dietaryGoal === 'lose') {
      proteinRatio = 0.30;  // Higher protein for satiety and muscle preservation
      carbsRatio = 0.40;
      fatRatio = 0.30;
    } else if (data.dietaryGoal === 'gain') {
      proteinRatio = 0.30;  // Higher protein for muscle building
      carbsRatio = 0.45;
      fatRatio = 0.25;
    }

    return {
      calories,
      protein: Math.round((calories * proteinRatio) / 4),  // 4 kcal per gram protein
      carbs: Math.round((calories * carbsRatio) / 4),       // 4 kcal per gram carbs
      fat: Math.round((calories * fatRatio) / 9),           // 9 kcal per gram fat
    };
  };

  const calculatedMacros = calculateMacros();
  
  // Use custom values if set, otherwise use calculated
  const currentMacros = {
    calories: data.dailyCalories ?? calculatedMacros.calories,
    protein: data.dailyProtein ?? calculatedMacros.protein,
    carbs: data.dailyCarbs ?? calculatedMacros.carbs,
    fat: data.dailyFat ?? calculatedMacros.fat,
  };

  const handleSaveMacros = async (values: { calories: number; protein: number; carbs: number; fat: number }) => {
    // Update local store
    updateData({
      dailyCalories: values.calories,
      dailyProtein: values.protein,
      dailyCarbs: values.carbs,
      dailyFat: values.fat,
    });

    // Save to database
    if (user) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({
          daily_calories: values.calories,
          daily_protein_target: values.protein,
          daily_carbs_target: values.carbs,
          daily_fat_target: values.fat,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    }

    toast.success(t('profile.macrosSaved'), {
      description: t('profile.macrosSavedDesc'),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground">
        <div className="px-4 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold">{data.fullName || t('profile.user')}</h1>
          <p className="text-primary-foreground/80">{user?.email || 'demo@wizefood.dk'}</p>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 -mt-4">
        {/* Macro goals */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {t('profile.dailyMacros')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMacrosDialogOpen(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{currentMacros.calories}</p>
                <p className="text-xs text-muted-foreground">{t('profile.calories')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{currentMacros.protein}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.protein')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{currentMacros.carbs}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.carbs')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{currentMacros.fat}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.fat')}</p>
              </div>

              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigate('/progress')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.progress')}</p>
                    <p className="text-sm text-muted-foreground">
                      {latestWeight 
                        ? t('profile.lastWeight', { weight: latestWeight })
                        : t('profile.trackProgress')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-life kalorier */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Pizza className="w-5 h-5 text-primary" />
                Real-life kalorier
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setRealLifeDialogOpen(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {realLifeCaloriesPerWeek ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{realLifeCaloriesPerWeek}</p>
                    <p className="text-xs text-muted-foreground">kcal/uge</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{Math.round(realLifeCaloriesPerWeek / 7)}</p>
                    <p className="text-xs text-muted-foreground">kcal/dag fratrukket</p>
                  </div>
                </div>
                {realLifeDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    "{realLifeDescription}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Fratrækkes automatisk fra din madplan
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Ingen real-life kalorier sat
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRealLifeDialogOpen(true)}
                >
                  <Pizza className="w-4 h-4 mr-2" />
                  Tilføj (øl, vin, pizza, etc.)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mit køkken / Lager */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Mit køkken
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
                Se alt
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">{inventoryItems.length}</p>
                <p className="text-sm text-muted-foreground">varer i dit køkken</p>
              </div>
              {expiringItems.length > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {expiringItems.length} udløber snart
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.goal')}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.dietaryGoal 
                        ? t(`profile.goals.${data.dietaryGoal}`) 
                        : t('profile.notSelected')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.household')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.peopleCount', { count: data.peopleCount })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setAllergiesDialogOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.allergies')}</p>
                    <p className="text-sm text-muted-foreground">
                      {allergiesCount > 0
                        ? t('profile.allergiesRegistered', { count: allergiesCount })
                        : t('profile.none')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setDislikesDialogOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <ThumbsDown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.dislikes', 'Ting du ikke kan lide')}</p>
                    <p className="text-sm text-muted-foreground">
                      {dislikesCount > 0
                        ? t('profile.dislikesRegistered', { count: dislikesCount }) || `${dislikesCount} registrerede`
                        : t('profile.none')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigate('/stores')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.preferredStores')}</p>
                    <p className="text-sm text-muted-foreground">
                      {preferredStoresCount > 0
                        ? t('profile.storesSelected', { count: preferredStoresCount })
                        : t('profile.selectStores')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigate('/salling-stores')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Madspild (Salling)</p>
                    <p className="text-sm text-muted-foreground">
                      Netto, Føtex, Bilka i nærheden
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {data.heightCm && (
            <Badge variant="secondary">{data.heightCm} cm</Badge>
          )}
          {data.weightKg && (
            <Badge variant="secondary">{data.weightKg} kg</Badge>
          )}
          {data.activityLevel && (
            <Badge variant="secondary">{t(`profile.activities.${data.activityLevel}`)}</Badge>
          )}
        </div>

        {/* Language selector */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t('profile.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setProfileDialogOpen(true)}
          >
            <Settings className="w-5 h-5 mr-3" />
            {t('profile.editProfile')}
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('profile.logout')}
          </Button>
        </div>

        {/* Version info */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          {t('profile.version')}
        </p>
      </main>

      <BottomNavigation />

      <EditMacrosDialog
        open={macrosDialogOpen}
        onOpenChange={setMacrosDialogOpen}
        currentValues={currentMacros}
        calculatedValues={calculatedMacros}
        dietaryGoal={data.dietaryGoal}
        profileData={{
          weightKg: data.weightKg,
          heightCm: data.heightCm,
          age: data.dateOfBirth ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear() : null,
          gender: data.gender,
          activityLevel: data.activityLevel,
        }}
        realLifeData={{
          caloriesPerWeek: realLifeCaloriesPerWeek,
          proteinPerWeek: realLifeProtein,
          carbsPerWeek: realLifeCarbs,
          fatPerWeek: realLifeFat,
        }}
        onSave={handleSaveMacros}
      />

      <EditProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />

      <EditAllergiesDialog
        open={allergiesDialogOpen}
        onOpenChange={setAllergiesDialogOpen}
      />

      <EditDislikesDialog
        open={dislikesDialogOpen}
        onOpenChange={setDislikesDialogOpen}
      />

      <EditRealLifeCaloriesDialog
        open={realLifeDialogOpen}
        onOpenChange={setRealLifeDialogOpen}
        currentDescription={realLifeDescription}
        currentCaloriesPerWeek={realLifeCaloriesPerWeek}
        currentProtein={realLifeProtein}
        currentCarbs={realLifeCarbs}
        currentFat={realLifeFat}
        onSave={(data) => {
          setRealLifeDescription(data.description);
          setRealLifeCaloriesPerWeek(data.calories_per_week);
          setRealLifeProtein(data.protein);
          setRealLifeCarbs(data.carbs);
          setRealLifeFat(data.fat);
        }}
      />
    </div>
  );
}
