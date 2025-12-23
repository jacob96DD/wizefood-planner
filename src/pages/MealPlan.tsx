import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Loader2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useMealPlans, type MealPlanDay, type MealPlanMeal } from '@/hooks/useMealPlans';
import { useGenerateMealPlan, type GenerateMealPlanResult } from '@/hooks/useGenerateMealPlan';
import { MealPlanConfigDialog } from '@/components/MealPlanConfigDialog';
import { MealOptionSwiper, type MacroTargets, type MealRecipe } from '@/components/MealOptionSwiper';
import { useGenerateShoppingList } from '@/hooks/useGenerateShoppingList';
import { WeekOverview } from '@/components/WeekOverview';
import { MealTrackingCard } from '@/components/MealTrackingCard';
import { AddSnackDialog } from '@/components/AddSnackDialog';
import { useMealPlanPreferences } from '@/hooks/useMealPlanPreferences';
import { useDailyMealLog } from '@/hooks/useDailyMealLog';
import { type FoodwasteProduct } from '@/hooks/useFoodwaste';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MealPlan() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Swipe mode state
  const [swipeMode, setSwipeMode] = useState(false);
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [recipesNeeded, setRecipesNeeded] = useState(7);
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);
  const [durationDays, setDurationDays] = useState(7);
  const [generatingMore, setGeneratingMore] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentPlan, loading, fetchMealPlans, saveMealPlan, deleteMealPlan } = useMealPlans();
  const { generateMealPlan, loading: generating } = useGenerateMealPlan();
  const [loadingMessage, setLoadingMessage] = useState(0);
  const { generateShoppingList } = useGenerateShoppingList();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackDialogOpen, setSnackDialogOpen] = useState(false);
  const { preferences } = useMealPlanPreferences();

  // Fetch profile for macro display
  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data);
      });
    }
  }, [user?.id]);

  const handleOpenConfig = () => setConfigOpen(true);

  // Loading message rotation
  useEffect(() => {
    if (!generating) {
      setLoadingMessage(0);
      return;
    }
    
    const interval = setInterval(() => {
      setLoadingMessage(prev => (prev + 1) % 4);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessages = [
    { emoji: '🛒', text: t('mealPlan.loadingCheckingOffers', 'Vi tjekker lige tilbuddene i supermarkedet...') },
    { emoji: '🔍', text: t('mealPlan.loadingFindingDeals', 'Finder de bedste tilbud til dig...') },
    { emoji: '📋', text: t('mealPlan.loadingCreatingRecipes', 'Sammensætter lækre opskrifter...') },
    { emoji: '✨', text: t('mealPlan.loadingFinalizing', 'Finpudser din personlige madplan...') },
  ];

  const handleGenerate = async (selectedFoodwaste?: FoodwasteProduct[]) => {
    setConfigOpen(false);

    // Slet eksisterende plan før generering af ny
    if (currentPlan?.id) {
      await deleteMealPlan(currentPlan.id);
    }

    const result = await generateMealPlan({
      duration_days: 7,
      selected_foodwaste: selectedFoodwaste,
    });

    if (result) {
      // Gå til swipe mode med genererede retter (ny struktur)
      setRecipes(result.recipes);
      setRecipesNeeded(result.recipesNeeded);
      setMacroTargets(result.macroTargets);
      setDurationDays(result.durationDays);
      setSwipeMode(true);
    }
  };

  const handleSwipeComplete = async (selectedMeals: MealRecipe[]) => {
    try {
      // Konverter valgte retter til MealPlanDay format
      // GENBRUG retter med modulo så de roterer henover ugen
      const meals: MealPlanDay[] = [];
      const today = new Date();
      
      for (let i = 0; i < durationDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        // Respekter skip-præferencer
        const dayMeals: MealPlanDay = {
          date: date.toISOString().split('T')[0],
          breakfast: preferences.skip_breakfast ? null : convertToMealPlanMeal(selectedMeals[i % selectedMeals.length]),
          lunch: preferences.skip_lunch ? null : convertToMealPlanMeal(selectedMeals[(i + 1) % selectedMeals.length]),
          dinner: preferences.skip_dinner ? null : convertToMealPlanMeal(selectedMeals[(i + 2) % selectedMeals.length]),
        };
        meals.push(dayMeals);
      }

      // Beregn total cost og savings
      const totalCost = selectedMeals.reduce((sum, meal) => sum + (meal.estimated_price || 0), 0);
      const totalSavings = selectedMeals.reduce((sum, meal) => {
        const savings = meal.uses_offers?.reduce((s, o) => s + (o.savings || 0), 0) || 0;
        return sum + savings;
      }, 0);

      // Gem madplan
      const savedPlan = await saveMealPlan({
        title: `Madplan - ${new Date().toLocaleDateString('da-DK')}`,
        duration_days: durationDays,
        meals,
        total_cost: totalCost,
        total_savings: totalSavings,
      });

      if (savedPlan) {
        // Slet gamle indkøbslister for denne bruger først
        try {
          await supabase
            .from('shopping_lists')
            .delete()
            .eq('user_id', user?.id)
            .neq('meal_plan_id', savedPlan.id);
        } catch (e) {
          console.warn('Could not delete old shopping lists:', e);
        }
        
        toast({
          title: t('mealPlan.saved', 'Madplan gemt!'),
          description: t('mealPlan.savedDescription', 'Din madplan er nu klar.'),
        });

        // Auto-generer indkøbsliste baseret på valgte retter
        // VIGTIGT: Send kun retterne én gang - IKKE for alle meal types!
        // Før sendte vi de samme retter til breakfast+lunch+dinner, hvilket tredoblet mængderne
        const selectedMealsForShopping = {
          breakfast: [], // Tom - vi vil ikke dobbelt-tælle
          lunch: [], // Tom - vi vil ikke dobbelt-tælle
          dinner: selectedMeals, // Alle valgte retter én gang
        };
        await generateShoppingList(selectedMealsForShopping, savedPlan.id);
      } else {
        toast({
          title: 'Fejl ved gemning',
          description: 'Kunne ikke gemme madplanen. Prøv igen.',
          variant: 'destructive',
        });
      }

      await fetchMealPlans();
    } catch (error) {
      console.error('handleSwipeComplete error:', error);
      toast({
        title: 'Fejl',
        description: 'Noget gik galt ved gemning af madplan. Prøv igen.',
        variant: 'destructive',
      });
    } finally {
      // KRITISK: Altid afslut swipe mode, selv ved fejl!
      setSwipeMode(false);
      setRecipes([]);
    }
  };

  const handleSwipeCancel = () => {
    setSwipeMode(false);
    setRecipes([]);
  };

  const handleGenerateMore = async (): Promise<MealRecipe[] | null> => {
    setGeneratingMore(true);
    try {
      const result = await generateMealPlan({ duration_days: 7 });
      if (result) {
        return result.recipes;
      }
      return null;
    } catch (error) {
      toast({
        title: 'Fejl',
        description: 'Kunne ikke generere flere retter',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGeneratingMore(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!currentPlan?.id) return;
    
    const success = await deleteMealPlan(currentPlan.id);
    if (success) {
      toast({
        title: '🗑️ Madplan slettet',
        description: 'Start forfra ved at generere en ny madplan.',
      });
      setDeleteDialogOpen(false);
    } else {
      toast({
        title: 'Fejl',
        description: 'Kunne ikke slette madplanen',
        variant: 'destructive',
      });
    }
  };

  const convertToMealPlanMeal = (recipe: MealRecipe): MealPlanMeal => ({
    recipeId: recipe.id,
    title: recipe.title,
    calories: recipe.calories,
    imageUrl: recipe.image_url || recipe.imageUrl || null,
    prepTime: recipe.prep_time,
    // Extended fields
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    description: recipe.description,
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    uses_offers: recipe.uses_offers,
  });

  const weekDays = [
    t('mealPlan.days.mon'),
    t('mealPlan.days.tue'),
    t('mealPlan.days.wed'),
    t('mealPlan.days.thu'),
    t('mealPlan.days.fri'),
    t('mealPlan.days.sat'),
    t('mealPlan.days.sun'),
  ];

  const getWeekLabel = () => {
    if (currentWeek === 0) return t('mealPlan.thisWeek');
    if (currentWeek > 0) return t('mealPlan.nextWeek');
    return t('mealPlan.lastWeek');
  };

  // Hent måltider for valgt dag fra aktuel plan
  const mealsData = currentPlan?.meals || [];
  const selectedMealsForDay: MealPlanDay | null = mealsData[selectedDay] || null;

  const totalCalories = selectedMealsForDay
    ? [selectedMealsForDay.breakfast, selectedMealsForDay.lunch, selectedMealsForDay.dinner]
        .filter(Boolean)
        .reduce((sum, meal) => sum + (meal?.calories || 0), 0)
    : 0;

  // Vis full-screen loading når vi genererer
  if (generating) {
    const currentMessage = loadingMessages[loadingMessage];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6 animate-bounce">{currentMessage.emoji}</div>
          <h2 className="text-xl font-bold mb-3">{currentMessage.text}</h2>
          <p className="text-muted-foreground mb-6">
            {t('mealPlan.loadingTime', 'Det tager ca. 30 sekunder')}
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Vis swipe interface hvis i swipe mode
  if (swipeMode && recipes.length > 0 && macroTargets) {
    return (
      <MealOptionSwiper
        recipes={recipes}
        recipesNeeded={recipesNeeded}
        macroTargets={macroTargets}
        onComplete={handleSwipeComplete}
        onCancel={handleSwipeCancel}
        onGenerateMore={handleGenerateMore}
        generatingMore={generatingMore}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold">{t('mealPlan.title')}</h1>
          </div>
        </header>
        <main className="px-4 pt-6 flex justify-center">
          <div className="animate-pulse text-muted-foreground">Indlæser...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{t('mealPlan.title')}</h1>
            <div className="flex items-center gap-2">
              {currentPlan && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary"
                onClick={handleOpenConfig}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5" />
                )}
                {generating ? t('mealPlan.generating', 'Genererer...') : t('mealPlan.generate')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek - 1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-medium">
              {t('mealPlan.weekNumber', { number: Math.abs(currentWeek) + 1 })} - {getWeekLabel()}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek + 1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
            {weekDays.map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={`flex-1 min-w-[44px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  selectedDay === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 pt-6">
        {!currentPlan ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">{t('mealPlan.noPlansYet')}</h2>
            <p className="text-muted-foreground mb-6">{t('mealPlan.generateFirst')}</p>
            <Button variant="default" onClick={handleOpenConfig} disabled={generating}>
              {generating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {generating ? t('mealPlan.generating', 'Genererer...') : t('mealPlan.generate')}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="week" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="week">📅 {t('mealPlan.weekView', 'Ugeoversigt')}</TabsTrigger>
              <TabsTrigger value="day">📆 {t('mealPlan.dayView', 'Dag for dag')}</TabsTrigger>
            </TabsList>

            <TabsContent value="week">
              <WeekOverview 
                plan={currentPlan} 
                onShoppingListClick={() => navigate('/shopping')}
                onDeletePlan={() => setDeleteDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="day">
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('mealPlan.todaysCalories')}</p>
                      <p className="text-2xl font-bold">{totalCalories} {t('common.kcal')}</p>
                    </div>
                    {currentPlan.total_savings && currentPlan.total_savings > 0 && (
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          {t('mealPlan.saveFromOffers', { amount: currentPlan.total_savings })}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{t('mealPlan.fromOffers')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {[
                  { mealType: 'breakfast' as const, label: t('mealPlan.meals.breakfast'), meal: selectedMealsForDay?.breakfast, icon: '🌅', skip: preferences.skip_breakfast },
                  { mealType: 'lunch' as const, label: t('mealPlan.meals.lunch'), meal: selectedMealsForDay?.lunch, icon: '☀️', skip: preferences.skip_lunch },
                  { mealType: 'dinner' as const, label: t('mealPlan.meals.dinner'), meal: selectedMealsForDay?.dinner, icon: '🌙', skip: preferences.skip_dinner },
                ].filter(({ skip }) => !skip).map(({ mealType, label, meal, icon }, index, arr) => (
                  <MealTrackingCard
                    key={mealType}
                    date={selectedMealsForDay?.date || new Date().toISOString().split('T')[0]}
                    mealType={mealType}
                    meal={meal}
                    icon={icon}
                    label={label}
                    showSnackButton={index === arr.length - 1}
                  />
                ))}
              </div>

              {/* Tilføj snack knap */}
              <Card className="mt-4 border-dashed">
                <CardContent className="p-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setSnackDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tilføj snack eller ekstra mad
                  </Button>
                </CardContent>
              </Card>

              <div className="mt-8">
                <Button variant="default" size="lg" className="w-full" onClick={() => navigate('/shopping')}>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  <span>{t('mealPlan.generateShoppingList')}</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <MealPlanConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        onGenerate={handleGenerate}
        generating={generating}
        profile={profile}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Slet madplan?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på du vil slette denne madplan? Du kan altid generere en ny bagefter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Slet og start forfra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddSnackDialog 
        open={snackDialogOpen} 
        onOpenChange={setSnackDialogOpen} 
        date={selectedMealsForDay?.date || new Date().toISOString().split('T')[0]} 
      />

      <BottomNavigation />
    </div>
  );
}
