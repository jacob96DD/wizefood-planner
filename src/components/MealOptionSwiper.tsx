import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Clock, Flame, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface MealRecipe {
  id: string;
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  uses_offers?: { offer_text: string; store: string; savings: number }[];
  estimated_price?: number;
  imageUrl?: string;
}

interface RecipeOptions {
  breakfast: MealRecipe[];
  lunch: MealRecipe[];
  dinner: MealRecipe[];
}

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealOptionSwiperProps {
  recipeOptions: RecipeOptions;
  durationDays: number;
  macroTargets: MacroTargets;
  onComplete: (selectedMeals: { breakfast: MealRecipe[]; lunch: MealRecipe[]; dinner: MealRecipe[] }) => void;
  onCancel: () => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner';

export function MealOptionSwiper({
  recipeOptions,
  durationDays,
  macroTargets,
  onComplete,
  onCancel,
}: MealOptionSwiperProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [currentMealType, setCurrentMealType] = useState<MealType>('breakfast');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState<{
    breakfast: MealRecipe[];
    lunch: MealRecipe[];
    dinner: MealRecipe[];
  }>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Get current options for the meal type
  const currentOptions = recipeOptions[currentMealType] || [];
  const currentRecipe = currentOptions[currentIndex];

  // Calculate how many meals needed per type
  const mealsNeeded = currentMealType === 'breakfast' && recipeOptions.breakfast.length === 0
    ? 0
    : durationDays;

  // Check if current meal type is complete
  const currentTypeComplete = selectedMeals[currentMealType].length >= mealsNeeded;

  // Calculate current macro averages from selected meals
  const calculateCurrentMacros = useCallback(() => {
    const allSelected = [
      ...selectedMeals.breakfast,
      ...selectedMeals.lunch,
      ...selectedMeals.dinner,
    ];
    
    if (allSelected.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const totals = allSelected.reduce(
      (sum, meal) => ({
        calories: sum.calories + (meal.calories || 0),
        protein: sum.protein + (meal.protein || 0),
        carbs: sum.carbs + (meal.carbs || 0),
        fat: sum.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const count = allSelected.length;
    return {
      calories: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbs: Math.round(totals.carbs / count),
      fat: Math.round(totals.fat / count),
    };
  }, [selectedMeals]);

  // Generate images for current meal type recipes
  useEffect(() => {
    const generateImages = async () => {
      const recipesToGenerate = currentOptions.filter(r => !images[r.id]);
      
      if (recipesToGenerate.length === 0) return;

      setLoadingImages(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('generate-meal-images', {
          body: { recipes: recipesToGenerate.slice(0, 5) }, // Batch of 5 at a time
        });

        if (error) {
          console.error('Image generation error:', error);
          return;
        }

        if (data?.images) {
          const newImages: Record<string, string> = {};
          data.images.forEach((img: { id: string; image_url: string | null }) => {
            if (img.image_url) {
              newImages[img.id] = img.image_url;
            }
          });
          setImages(prev => ({ ...prev, ...newImages }));
        }
      } catch (err) {
        console.error('Failed to generate images:', err);
      } finally {
        setLoadingImages(false);
      }
    };

    generateImages();
  }, [currentMealType, currentOptions, images]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentRecipe) return;

    setSwipeDirection(direction);

    setTimeout(() => {
      if (direction === 'right') {
        // Add to selected
        setSelectedMeals(prev => ({
          ...prev,
          [currentMealType]: [...prev[currentMealType], currentRecipe],
        }));

        toast({
          title: t('mealSwiper.added', 'Tilføjet!'),
          description: currentRecipe.title,
        });
      }

      // Move to next recipe or meal type
      if (currentIndex < currentOptions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Check if we need more meals of this type
        const selectedCount = selectedMeals[currentMealType].length + (direction === 'right' ? 1 : 0);
        if (selectedCount < mealsNeeded) {
          // Go back to start of this meal type
          setCurrentIndex(0);
        } else {
          // Move to next meal type
          moveToNextMealType();
        }
      }

      setSwipeDirection(null);
    }, 200);
  };

  const moveToNextMealType = () => {
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
    const currentIdx = mealTypes.indexOf(currentMealType);
    
    for (let i = currentIdx + 1; i < mealTypes.length; i++) {
      const nextType = mealTypes[i];
      if (recipeOptions[nextType].length > 0 && selectedMeals[nextType].length < durationDays) {
        setCurrentMealType(nextType);
        setCurrentIndex(0);
        return;
      }
    }

    // All done!
    handleComplete();
  };

  const handleComplete = () => {
    toast({
      title: t('mealSwiper.complete', 'Madplan klar!'),
      description: t('mealSwiper.completeDesc', 'Dine valgte retter er gemt'),
    });
    onComplete(selectedMeals);
  };

  // Check if all selections are complete
  const allComplete = 
    (recipeOptions.breakfast.length === 0 || selectedMeals.breakfast.length >= durationDays) &&
    (recipeOptions.lunch.length === 0 || selectedMeals.lunch.length >= durationDays) &&
    (recipeOptions.dinner.length === 0 || selectedMeals.dinner.length >= durationDays);

  const currentMacros = calculateCurrentMacros();
  const totalSelected = selectedMeals.breakfast.length + selectedMeals.lunch.length + selectedMeals.dinner.length;
  const totalNeeded = 
    (recipeOptions.breakfast.length > 0 ? durationDays : 0) +
    (recipeOptions.lunch.length > 0 ? durationDays : 0) +
    (recipeOptions.dinner.length > 0 ? durationDays : 0);

  const mealTypeLabels: Record<MealType, string> = {
    breakfast: t('mealPlan.meals.breakfast', 'Morgenmad'),
    lunch: t('mealPlan.meals.lunch', 'Frokost'),
    dinner: t('mealPlan.meals.dinner', 'Aftensmad'),
  };

  if (!currentRecipe && !allComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('mealSwiper.loading', 'Indlæser retter...')}</p>
      </div>
    );
  }

  if (allComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">{t('mealSwiper.allDone', 'Alle retter valgt!')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('mealSwiper.selectedCount', { count: totalSelected })}
        </p>
        <Button variant="hero" onClick={handleComplete}>
          {t('mealSwiper.createPlan', 'Opret madplan')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('common.cancel', 'Annuller')}
          </Button>
          <span className="text-sm font-medium">
            {mealTypeLabels[currentMealType]}: {selectedMeals[currentMealType].length}/{mealsNeeded}
          </span>
        </div>
        
        <Progress value={(totalSelected / totalNeeded) * 100} className="h-2" />
        
        <div className="flex gap-2 mt-3 justify-center">
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(type => (
            recipeOptions[type].length > 0 && (
              <Badge
                key={type}
                variant={currentMealType === type ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  setCurrentMealType(type);
                  setCurrentIndex(0);
                }}
              >
                {mealTypeLabels[type]} ({selectedMeals[type].length}/{durationDays})
              </Badge>
            )
          ))}
        </div>
      </div>

      {/* Swipe Card */}
      <div className="flex-1 p-4 flex flex-col">
        <Card 
          className={`flex-1 overflow-hidden transition-transform duration-200 ${
            swipeDirection === 'left' ? '-translate-x-full opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''
          }`}
        >
          <CardContent className="p-0 h-full flex flex-col">
            {/* Image */}
            <div className="relative h-48 bg-muted">
              {loadingImages && !images[currentRecipe.id] ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : images[currentRecipe.id] ? (
                <img
                  src={images[currentRecipe.id]}
                  alt={currentRecipe.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  🍽️
                </div>
              )}
              
              {/* Tags overlay */}
              <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                {currentRecipe.tags?.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-background/80">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-lg font-bold mb-1">{currentRecipe.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {currentRecipe.description}
              </p>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-sm font-bold">{currentRecipe.calories}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{currentRecipe.protein}g</div>
                  <div className="text-xs text-muted-foreground">protein</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{currentRecipe.carbs}g</div>
                  <div className="text-xs text-muted-foreground">kulhydrat</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{currentRecipe.fat}g</div>
                  <div className="text-xs text-muted-foreground">fedt</div>
                </div>
              </div>

              {/* Time & Price */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{currentRecipe.prep_time + (currentRecipe.cook_time || 0)} min</span>
                </div>
                {currentRecipe.estimated_price && (
                  <div className="flex items-center gap-1">
                    <span>💰</span>
                    <span>{currentRecipe.estimated_price} kr</span>
                  </div>
                )}
              </div>

              {/* Offers used */}
              {currentRecipe.uses_offers && currentRecipe.uses_offers.length > 0 && (
                <div className="mb-3">
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                    🏷️ Bruger tilbud: {currentRecipe.uses_offers[0].offer_text}
                    {currentRecipe.uses_offers[0].savings > 0 && ` (spar ${currentRecipe.uses_offers[0].savings} kr)`}
                  </Badge>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Current macro average */}
              {totalSelected > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-1">📊 Gennemsnit af valgte retter:</p>
                  <div className="flex gap-3">
                    <span className={currentMacros.calories <= macroTargets.calories * 1.1 ? 'text-green-600' : 'text-orange-500'}>
                      {currentMacros.calories} kcal
                    </span>
                    <span className={currentMacros.protein >= macroTargets.protein * 0.9 ? 'text-green-600' : 'text-orange-500'}>
                      {currentMacros.protein}g protein
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Swipe Buttons */}
        <div className="flex justify-center gap-8 mt-4 pb-4">
          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleSwipe('left')}
          >
            <X className="w-8 h-8" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
            onClick={() => handleSwipe('right')}
          >
            <Check className="w-8 h-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
