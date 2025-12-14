import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useMealPlans, type MealPlanDay } from '@/hooks/useMealPlans';

export default function MealPlan() {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const navigate = useNavigate();
  const { currentPlan, loading } = useMealPlans();

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
  const meals = currentPlan?.meals || [];
  const selectedMeals: MealPlanDay | null = meals[selectedDay] || null;

  const totalCalories = selectedMeals
    ? [selectedMeals.breakfast, selectedMeals.lunch, selectedMeals.dinner]
        .filter(Boolean)
        .reduce((sum, meal) => sum + (meal?.calories || 0), 0)
    : 0;

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
        {!currentPlan ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">{t('mealPlan.noPlansYet')}</h2>
            <p className="text-muted-foreground mb-6">{t('mealPlan.generateFirst')}</p>
            <Button variant="hero" onClick={() => navigate('/home')}>
              <Sparkles className="w-5 h-5 mr-2" />
              {t('mealPlan.generate')}
            </Button>
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
                { time: t('mealPlan.meals.breakfast'), meal: selectedMeals?.breakfast, icon: '🌅' },
                { time: t('mealPlan.meals.lunch'), meal: selectedMeals?.lunch, icon: '☀️' },
                { time: t('mealPlan.meals.dinner'), meal: selectedMeals?.dinner, icon: '🌙' },
              ].map(({ time, meal, icon }) => (
                <Card key={time} className="overflow-hidden">
                  <CardContent className="p-0">
                    {meal ? (
                      <div className="flex">
                        <img 
                          src={meal.imageUrl || '/placeholder.svg'} 
                          alt={meal.title} 
                          className="w-24 h-24 object-cover" 
                        />
                        <div className="flex-1 p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>{icon}</span>
                            <span>{time}</span>
                          </div>
                          <h3 className="font-semibold line-clamp-1">{meal.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {meal.calories} {t('common.kcal')} · {meal.prepTime}+ {t('common.minutes')}
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
