import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Flame, Trash2 } from 'lucide-react';
import { RecipeDetailDialog, type RecipeDetail } from './RecipeDetailDialog';
import type { MealPlan, MealPlanDay, MealPlanMeal } from '@/hooks/useMealPlans';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface MealWithPrice extends MealPlanMeal {
  estimated_price?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface WeekOverviewProps {
  plan: MealPlan;
  onShoppingListClick: () => void;
  onDeletePlan?: () => void;
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
  // Extended fields from MealPlanMeal
  description?: string;
  ingredients?: { name: string; amount: string; unit: string }[];
  instructions?: string[];
}

// Gennemsnitligt dansk husholdningsbudget
const AVERAGE_WEEKLY_COST = 385; // ~1670 kr/måned ÷ 4.3 uger

export function WeekOverview({ plan, onShoppingListClick, onDeletePlan }: WeekOverviewProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shoppingListTotal, setShoppingListTotal] = useState<number | null>(null);

  // Fetch shopping list total price for this meal plan
  useEffect(() => {
    if (!user || !plan.id) return;
    
    supabase
      .from('shopping_lists')
      .select('total_price')
      .eq('user_id', user.id)
      .eq('meal_plan_id', plan.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.total_price) {
          setShoppingListTotal(data.total_price);
        }
      });
  }, [user, plan.id]);

  const weekDayLabels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  // Beregn samlet indkøbspris for hele ugen
  const calculateWeeklyTotals = () => {
    let totalPortions = 0;
    
    plan.meals.forEach(day => {
      [day.breakfast, day.lunch, day.dinner].forEach(meal => {
        if (meal?.recipeId) {
          totalPortions++;
        }
      });
    });
    
    // Brug shopping list total price hvis tilgængelig
    const effectiveCost = shoppingListTotal || plan.total_cost || 0;
    const totalSavings = plan.total_savings || 0;
    const costPerPortion = totalPortions > 0 && effectiveCost > 0 ? effectiveCost / totalPortions : 0;
    const savingsVsAverage = AVERAGE_WEEKLY_COST - effectiveCost;
    
    return { totalCost: effectiveCost, totalSavings, costPerPortion, totalPortions, savingsVsAverage };
  };

  const weeklyTotals = calculateWeeklyTotals();

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
            // Extended fields
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            description: meal.description,
            ingredients: meal.ingredients,
            instructions: meal.instructions,
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
    // Create a RecipeDetail from the stored dish data
    const recipeDetail: RecipeDetail = {
      id: dish.id,
      title: dish.title,
      description: dish.description,
      calories: dish.calories,
      protein: dish.protein || 0,
      carbs: dish.carbs || 0,
      fat: dish.fat || 0,
      prep_time: dish.prepTime || 0,
      servings: dish.count,
      ingredients: dish.ingredients || [],
      instructions: dish.instructions || [],
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-background rounded-xl">
              <span className="text-xl">💰</span>
              <div className="text-lg font-bold">
                {weeklyTotals.totalCost > 0 ? `${weeklyTotals.totalCost.toFixed(0)} kr` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">denne uge</div>
            </div>
            <div className="text-center p-3 bg-background rounded-xl">
              <span className="text-xl">📊</span>
              <div className="text-lg font-bold">{AVERAGE_WEEKLY_COST} kr</div>
              <div className="text-xs text-muted-foreground">gennemsnitligt</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-background rounded-xl">
              <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{dailyAvgCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag</div>
            </div>
            <div className="text-center p-3 bg-background rounded-xl">
              <span className="text-xl">🍽️</span>
              <div className="text-lg font-bold">
                {weeklyTotals.costPerPortion > 0 ? `~${weeklyTotals.costPerPortion.toFixed(0)} kr` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">per portion</div>
            </div>
          </div>

          {/* Besparelser ift. gennemsnit */}
          {weeklyTotals.totalCost > 0 && (
            <div className={`rounded-lg p-3 text-center mb-3 ${
              weeklyTotals.savingsVsAverage >= 0 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-orange-500/10 border border-orange-500/20'
            }`}>
              <span className={`font-semibold ${
                weeklyTotals.savingsVsAverage >= 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {weeklyTotals.savingsVsAverage >= 0 
                  ? `🎉 Du sparer ${weeklyTotals.savingsVsAverage.toFixed(0)} kr ift. gennemsnit!`
                  : `⚠️ ${Math.abs(weeklyTotals.savingsVsAverage).toFixed(0)} kr over gennemsnit`}
              </span>
            </div>
          )}

          {/* Tilbudsbesparelse */}
          {weeklyTotals.totalSavings > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
              <span className="text-blue-600 text-sm">
                💳 Heraf {weeklyTotals.totalSavings} kr sparet fra tilbud
              </span>
            </div>
          )}
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

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button variant="hero" size="xl" className="w-full" onClick={onShoppingListClick}>
          <ShoppingCart className="w-5 h-5" />
          <span>{t('mealPlan.viewShoppingList', 'Se indkøbsliste')}</span>
        </Button>
        
        {onDeletePlan && (
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDeletePlan}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Slet og start forfra
          </Button>
        )}
      </div>

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
