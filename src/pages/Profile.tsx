import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Settings, LogOut, ChevronRight, Target, Users, AlertTriangle, Edit2, Globe, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { data } = useOnboardingStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Calculate daily calorie needs (simplified formula)
  const calculateCalories = () => {
    if (!data.weightKg || !data.heightCm || !data.dateOfBirth) return 2000;
    
    const age = new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear();
    let bmr = data.gender === 'male'
      ? 88.36 + (13.4 * data.weightKg) + (4.8 * data.heightCm) - (5.7 * age)
      : 447.6 + (9.2 * data.weightKg) + (3.1 * data.heightCm) - (4.3 * age);

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      athlete: 1.9,
    };

    const multiplier = activityMultipliers[data.activityLevel] || 1.55;
    let calories = Math.round(bmr * multiplier);

    // Adjust for goal
    if (data.dietaryGoal === 'lose') calories -= 500;
    if (data.dietaryGoal === 'gain') calories += 500;

    return calories;
  };

  const dailyCalories = calculateCalories();
  const dailyProtein = Math.round((dailyCalories * 0.25) / 4);
  const dailyCarbs = Math.round((dailyCalories * 0.45) / 4);
  const dailyFat = Math.round((dailyCalories * 0.30) / 9);

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
              <Button variant="ghost" size="sm">
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{dailyCalories}</p>
                <p className="text-xs text-muted-foreground">{t('profile.calories')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{dailyProtein}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.protein')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{dailyCarbs}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.carbs')}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{dailyFat}g</p>
                <p className="text-xs text-muted-foreground">{t('profile.fat')}</p>
              </div>
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('profile.allergies')}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.selectedAllergens.length > 0
                        ? t('profile.allergiesRegistered', { count: data.selectedAllergens.length })
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
                      {t('profile.selectStores')}
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
            onClick={() => navigate('/onboarding')}
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
    </div>
  );
}
