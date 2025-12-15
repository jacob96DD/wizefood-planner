import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDailyMealLog, type FoodPhoto } from '@/hooks/useDailyMealLog';
import type { MealPlanMeal } from '@/hooks/useMealPlans';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

interface MealTrackingCardProps {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  meal: MealPlanMeal | null;
  icon: string;
  label: string;
}

export function MealTrackingCard({ date, mealType, meal, icon, label }: MealTrackingCardProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { log, saving, toggleMealCompleted, toggleMealSkipped, addFoodPhoto } = useDailyMealLog(date);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isCompleted = log?.[`${mealType}_completed`] ?? false;
  const isSkipped = log?.[`${mealType}_skipped`] ?? false;

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${date}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meal-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('meal-images')
        .getPublicUrl(fileName);

      const photo: FoodPhoto = {
        url: urlData.publicUrl,
        timestamp: new Date().toISOString(),
        description: mealType,
      };

      await addFoodPhoto(photo);
      toast({
        title: t('mealPlan.mealTracking.addPhoto', 'Billede tilføjet'),
        description: meal?.title || label,
      });
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast({
        title: 'Fejl',
        description: 'Kunne ikke uploade billede',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
