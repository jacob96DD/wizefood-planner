import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDailyMealLog } from '@/hooks/useDailyMealLog';
import { AddSnackDialog } from '@/components/AddSnackDialog';
import type { MealPlanMeal } from '@/hooks/useMealPlans';

interface MealTrackingCardProps {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  meal: MealPlanMeal | null;
  icon: string;
  label: string;
  showSnackButton?: boolean;
}

export function MealTrackingCard({ date, mealType, meal, icon, label, showSnackButton = false }: MealTrackingCardProps) {
  const { t } = useTranslation();
  const { log, saving, toggleMealCompleted, toggleMealSkipped } = useDailyMealLog(date);
  const [snackDialogOpen, setSnackDialogOpen] = useState(false);

  const isCompleted = log?.[`${mealType}_completed`] ?? false;
  const isSkipped = log?.[`${mealType}_skipped`] ?? false;

  if (!meal) {
    return (
      <Card className="overflow-hidden opacity-60">
        <CardContent className="p-4 text-center text-muted-foreground">
          <span className="text-2xl mb-2 block">{icon}</span>
          <p className="text-sm">{label} - {t('mealPlan.addRecipe')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden transition-all ${isCompleted ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20' : isSkipped ? 'opacity-50' : ''}`}>
      <CardContent className="p-0">
        <div className="flex">
          <div className="relative w-24 h-24 flex-shrink-0">
            <img 
              src={meal.imageUrl || '/placeholder.svg'} 
              alt={meal.title} 
              className={`w-full h-full object-cover ${isSkipped ? 'grayscale' : ''}`}
            />
            {isCompleted && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            )}
            {isSkipped && (
              <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                <X className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{icon}</span>
              <span>{label}</span>
              {isCompleted && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  {t('mealPlan.mealTracking.completed', 'Spist')}
                </Badge>
              )}
              {isSkipped && (
                <Badge variant="secondary" className="text-xs">
                  {t('mealPlan.mealTracking.skipped', 'Sprunget over')}
                </Badge>
              )}
            </div>
            <h3 className={`font-semibold line-clamp-1 ${isSkipped ? 'line-through text-muted-foreground' : ''}`}>
              {meal.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {meal.calories} {t('common.kcal')} · {meal.prepTime}+ {t('common.minutes')}
            </p>
            
            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                variant={isCompleted ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleMealCompleted(mealType)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                {isCompleted ? t('mealPlan.mealTracking.completed', 'Spist') : t('mealPlan.mealTracking.markEaten', 'Spist')}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleMealSkipped(mealType)}
                disabled={saving}
              >
                <X className="w-3 h-3 mr-1" />
                {t('mealPlan.mealTracking.skip', 'Spring over')}
              </Button>

              {showSnackButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSnackDialogOpen(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Snack
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      <AddSnackDialog 
        open={snackDialogOpen} 
        onOpenChange={setSnackDialogOpen} 
        date={date} 
      />
    </Card>
  );
}
