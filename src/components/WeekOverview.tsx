import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Flame } from 'lucide-react';
import { RecipeDetailDialog, type RecipeDetail } from './RecipeDetailDialog';
import type { MealPlan, MealPlanDay, MealPlanMeal } from '@/hooks/useMealPlans';

interface WeekOverviewProps {
  plan: MealPlan;
  onShoppingListClick: () => void;
}

interface UniqueDish {
  id: string;
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl: string | null;
  prepTime: number | null;
  usageDays: string[];
  count: number;
  mealType: 'breakfast' | 'lunch' | 'dinner';
}

export function WeekOverview({ plan, onShoppingListClick }: WeekOverviewProps) {
  const { t } = useTranslation();
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weekDayLabels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  // Extract unique dishes with usage days
  const getUniqueDishes = (): UniqueDish[] => {
    const dishMap = new Map<string, UniqueDish>();

    plan.meals.forEach((day, dayIndex) => {
      const dayLabel = weekDayLabels[dayIndex] || `Dag ${dayIndex + 1}`;

      const processMeal = (meal: MealPlanMeal | null, mealType: 'breakfast' | 'lunch' | 'dinner') => {
        if (!meal) return;

        const existing = dishMap.get(meal.recipeId);
        if (existing) {
          existing.usageDays.push(dayLabel);
          existing.count++;
        } else {
          dishMap.set(meal.recipeId, {
            id: meal.recipeId,
            title: meal.title,
            calories: meal.calories,
            imageUrl: meal.imageUrl,
            prepTime: meal.prepTime,
            usageDays: [dayLabel],
            count: 1,
            mealType,
          });
        }
      };

      processMeal(day.breakfast, 'breakfast');
      processMeal(day.lunch, 'lunch');
      processMeal(day.dinner, 'dinner');
    });

    return Array.from(dishMap.values());
  };

  const uniqueDishes = getUniqueDishes();

  // Calculate weekly totals
  const weeklyCalories = plan.meals.reduce((sum, day) => {
    const dayCalories = [day.breakfast, day.lunch, day.dinner]
      .filter(Boolean)
      .reduce((s, meal) => s + (meal?.calories || 0), 0);
    return sum + dayCalories;
  }, 0);

  const dailyAvgCalories = Math.round(weeklyCalories / plan.duration_days);

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
  };

  const mealTypeLabels = {
    breakfast: t('mealPlan.meals.breakfast', 'Morgenmad'),
    lunch: t('mealPlan.meals.lunch', 'Frokost'),
    dinner: t('mealPlan.meals.dinner', 'Aftensmad'),
  };

  const handleRecipeClick = (dish: UniqueDish) => {
    // Create a RecipeDetail from the dish data
    const recipeDetail: RecipeDetail = {
      id: dish.id,
      title: dish.title,
      calories: dish.calories,
      protein: dish.protein || 0,
      carbs: dish.carbs || 0,
      fat: dish.fat || 0,
      prep_time: dish.prepTime || 0,
      servings: dish.count,
      ingredients: [],
      instructions: [],
      image_url: dish.imageUrl,
    };
    setSelectedRecipe(recipeDetail);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Weekly Summary Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              📅 {t('mealPlan.weekOverview', 'Ugeoversigt')}
            </h3>
            <Badge variant="secondary">
              {uniqueDishes.length} {t('mealPlan.uniqueDishes', 'unikke retter')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-background rounded-xl">
              <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{dailyAvgCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag (gns.)</div>
            </div>
            <div className="text-center p-3 bg-background rounded-xl">
              <span className="text-xl">💰</span>
              <div className="text-lg font-bold">{plan.total_cost ? `${plan.total_cost} kr` : '-'}</div>
              <div className="text-xs text-muted-foreground">
                {plan.total_savings && plan.total_savings > 0 && (
                  <span className="text-green-600">Spar {plan.total_savings} kr</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unique Dishes */}
      <div>
        <h3 className="font-semibold mb-3 px-1">
          🍽️ {t('mealPlan.yourDishes', 'Dine retter (genbruges hele ugen)')}
        </h3>
        <div className="space-y-3">
          {uniqueDishes.map((dish) => (
            <Card 
              key={dish.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRecipeClick(dish)}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-20 h-20 bg-muted flex-shrink-0">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {mealTypeIcons[dish.mealType]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{mealTypeIcons[dish.mealType]}</span>
                      <span>{mealTypeLabels[dish.mealType]}</span>
                    </div>
                    <h4 className="font-semibold text-sm line-clamp-1">{dish.title}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {dish.calories} kcal · {dish.prepTime}+ min
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {dish.usageDays.join(', ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Shopping List Button */}
      <Button variant="hero" size="xl" className="w-full" onClick={onShoppingListClick}>
        <ShoppingCart className="w-5 h-5" />
        <span>{t('mealPlan.viewShoppingList', 'Se indkøbsliste')}</span>
      </Button>

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
