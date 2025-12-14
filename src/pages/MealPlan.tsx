import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Recipe } from '@/lib/supabase';

export default function MealPlan() {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const weekDays = [
    t('mealPlan.days.mon'),
    t('mealPlan.days.tue'),
    t('mealPlan.days.wed'),
    t('mealPlan.days.thu'),
    t('mealPlan.days.fri'),
    t('mealPlan.days.sat'),
    t('mealPlan.days.sun'),
  ];

  useEffect(() => {
    if (user) {
      fetchLikedRecipes();
    }
  }, [user]);

  const fetchLikedRecipes = async () => {
    if (!user) return;

    const { data: swipes } = await supabase
      .from('swipes')
      .select('recipe_id')
      .eq('user_id', user.id)
      .in('direction', ['right', 'up']);

    if (swipes && swipes.length > 0) {
      const recipeIds = swipes.map(s => s.recipe_id);
      const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipes) {
        setLikedRecipes(recipes.map(r => ({
          ...r,
          ingredients: r.ingredients as Recipe['ingredients'],
          instructions: r.instructions as Recipe['instructions'],
        })));
      }
    }
  };

  // Generate mock meal plan from liked recipes
  const generateMealPlan = () => {
    return weekDays.map((_, index) => ({
      breakfast: likedRecipes[index % likedRecipes.length] || null,
      lunch: likedRecipes[(index + 1) % likedRecipes.length] || null,
      dinner: likedRecipes[(index + 2) % likedRecipes.length] || null,
    }));
  };

  const mealPlan = likedRecipes.length > 0 ? generateMealPlan() : [];
  const selectedMeals = mealPlan[selectedDay] || { breakfast: null, lunch: null, dinner: null };

  const totalCalories = [selectedMeals.breakfast, selectedMeals.lunch, selectedMeals.dinner]
    .filter(Boolean)
    .reduce((sum, meal) => sum + (meal?.calories || 0), 0);

  const getWeekLabel = () => {
    if (currentWeek === 0) return t('mealPlan.thisWeek');
    if (currentWeek > 0) return t('mealPlan.nextWeek');
    return t('mealPlan.lastWeek');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{t('mealPlan.title')}</h1>
            <Button variant="ghost" size="sm" className="text-primary">
              <Sparkles className="w-4 h-4 mr-1.5" />
              {t('mealPlan.generate')}
            </Button>
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
        {likedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">{t('mealPlan.noRecipesYet')}</h2>
            <p className="text-muted-foreground mb-6">{t('mealPlan.swipeToAdd')}</p>
            <Button variant="hero" onClick={() => navigate('/home')}>{t('mealPlan.findRecipes')}</Button>
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('mealPlan.todaysCalories')}</p>
                    <p className="text-2xl font-bold">{totalCalories} {t('common.kcal')}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">{t('mealPlan.saveFromOffers', { amount: 45 })}</Badge>
                    <p className="text-xs text-muted-foreground">{t('mealPlan.fromOffers')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {[
                { time: t('mealPlan.meals.breakfast'), meal: selectedMeals.breakfast, icon: '🌅' },
                { time: t('mealPlan.meals.lunch'), meal: selectedMeals.lunch, icon: '☀️' },
                { time: t('mealPlan.meals.dinner'), meal: selectedMeals.dinner, icon: '🌙' },
              ].map(({ time, meal, icon }) => (
                <Card key={time} className="overflow-hidden">
                  <CardContent className="p-0">
                    {meal ? (
                      <div className="flex">
                        <img src={meal.image_url || ''} alt={meal.title} className="w-24 h-24 object-cover" />
                        <div className="flex-1 p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>{icon}</span>
                            <span>{time}</span>
                          </div>
                          <h3 className="font-semibold line-clamp-1">{meal.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {meal.calories} {t('common.kcal')} · {meal.prep_time}+ {t('common.minutes')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <span className="text-2xl mb-2 block">{icon}</span>
                        <p className="text-sm">{time} - {t('mealPlan.addRecipe')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Button variant="hero" size="xl" className="w-full" onClick={() => navigate('/shopping-list')}>
                <ShoppingCart className="w-5 h-5" />
                <span>{t('mealPlan.generateShoppingList')}</span>
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
