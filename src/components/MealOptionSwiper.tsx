import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Clock, Flame, Loader2, ChevronLeft, RefreshCw } from 'lucide-react';
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

export interface MealRecipe {
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
  offers?: { offer_text?: string; store?: string; savings?: number }[];
  estimated_price?: number;
  imageUrl?: string;
  image_url?: string;
}

export interface RecipeOptions {
  breakfast: MealRecipe[];
  lunch: MealRecipe[];
  dinner: MealRecipe[];
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type CookingStyle = 'daily' | 'meal_prep_2' | 'meal_prep_3' | 'meal_prep_4';

interface MealOptionSwiperProps {
  recipeOptions: RecipeOptions;
  durationDays: number;
  cookingStyle: CookingStyle;
  macroTargets: MacroTargets;
  onComplete: (selectedMeals: { breakfast: MealRecipe[]; lunch: MealRecipe[]; dinner: MealRecipe[] }) => void;
  onCancel: () => void;
  onGenerateMore?: () => Promise<RecipeOptions | null>;
  generatingMore?: boolean;
}

type MealType = 'breakfast' | 'lunch' | 'dinner';

export function MealOptionSwiper({
  recipeOptions,
  durationDays,
  cookingStyle,
  macroTargets,
  onComplete,
  onCancel,
  onGenerateMore,
  generatingMore = false,
}: MealOptionSwiperProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Initialize to the first meal type that has recipes
  const getInitialMealType = (): MealType => {
    if (recipeOptions.breakfast.length > 0) return 'breakfast';
    if (recipeOptions.lunch.length > 0) return 'lunch';
    if (recipeOptions.dinner.length > 0) return 'dinner';
    return 'breakfast'; // fallback
  };
  
  const [currentMealType, setCurrentMealType] = useState<MealType>(getInitialMealType);
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
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [localRecipeOptions, setLocalRecipeOptions] = useState(recipeOptions);

  // Update local options when recipeOptions changes
  useEffect(() => {
    setLocalRecipeOptions(recipeOptions);
  }, [recipeOptions]);

  // Get current options for the meal type
  const currentOptions = localRecipeOptions[currentMealType] || [];
  const currentRecipe = currentOptions[currentIndex];
  
  // Calculate how many meals needed per type based on cooking style
  const getMealsNeeded = (mealType: MealType): number => {
    // If no recipes for this meal type, need 0
    if (recipeOptions[mealType].length === 0) return 0;
    
    // Based on cooking style:
    // - daily: need 7 unique meals (1 per day)
    // - meal_prep_2: need 2 unique meals (repeat through week)
    // - meal_prep_3: need 3 unique meals
    // - meal_prep_4: need 4 unique meals
    switch (cookingStyle) {
      case 'meal_prep_2': return 2;
      case 'meal_prep_3': return 3;
      case 'meal_prep_4': return 4;
      case 'daily':
      default: return durationDays;
    }
  };
  
  const mealsNeeded = getMealsNeeded(currentMealType);
  
  // Check if we've swiped through all options without selecting enough
  const needsMoreOptions = currentIndex >= currentOptions.length && selectedMeals[currentMealType].length < mealsNeeded;

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

  // Generate images for ALL recipes in background (non-blocking)
  useEffect(() => {
    const generateAllImages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Collect all recipes from all meal types
      const allRecipes = [
        ...localRecipeOptions.breakfast,
        ...localRecipeOptions.lunch,
        ...localRecipeOptions.dinner,
      ];

      // Filter out recipes that already have images or are being loaded
      const recipesToGenerate = allRecipes.filter(
        r => !images[r.id] && !loadingImages[r.id]
      );

      if (recipesToGenerate.length === 0) return;

      // Process in batches of 3 for faster individual loading
      const batchSize = 3;
      for (let i = 0; i < recipesToGenerate.length; i += batchSize) {
        const batch = recipesToGenerate.slice(i, i + batchSize);
        
        // Mark batch as loading
        setLoadingImages(prev => {
          const next = { ...prev };
          batch.forEach(r => { next[r.id] = true; });
          return next;
        });

        // Generate images for batch (fire and forget, don't await between batches)
        supabase.functions.invoke('generate-meal-images', {
          body: { recipes: batch },
        }).then(({ data, error }) => {
          if (error) {
            console.error('Image generation error:', error);
            // Clear loading state on error
            setLoadingImages(prev => {
              const next = { ...prev };
              batch.forEach(r => { next[r.id] = false; });
              return next;
            });
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

          // Clear loading state
          setLoadingImages(prev => {
            const next = { ...prev };
            batch.forEach(r => { next[r.id] = false; });
            return next;
          });
        }).catch(err => {
          console.error('Failed to generate images:', err);
          setLoadingImages(prev => {
            const next = { ...prev };
            batch.forEach(r => { next[r.id] = false; });
            return next;
          });
        });
      }
    };

    generateAllImages();
  }, [localRecipeOptions]); // Only re-run when recipe options change

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
      const neededForType = getMealsNeeded(nextType);
      if (recipeOptions[nextType].length > 0 && selectedMeals[nextType].length < neededForType) {
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
    (localRecipeOptions.breakfast.length === 0 || selectedMeals.breakfast.length >= getMealsNeeded('breakfast')) &&
    (localRecipeOptions.lunch.length === 0 || selectedMeals.lunch.length >= getMealsNeeded('lunch')) &&
    (localRecipeOptions.dinner.length === 0 || selectedMeals.dinner.length >= getMealsNeeded('dinner'));

  const currentMacros = calculateCurrentMacros();
  const totalSelected = selectedMeals.breakfast.length + selectedMeals.lunch.length + selectedMeals.dinner.length;
  const totalNeeded = getMealsNeeded('breakfast') + getMealsNeeded('lunch') + getMealsNeeded('dinner');

  const mealTypeLabels: Record<MealType, string> = {
    breakfast: t('mealPlan.meals.breakfast', 'Morgenmad'),
    lunch: t('mealPlan.meals.lunch', 'Frokost'),
    dinner: t('mealPlan.meals.dinner', 'Aftensmad'),
  };

  // Handle generate more options
  const handleGenerateMore = async () => {
    if (!onGenerateMore) return;
    
    const newOptions = await onGenerateMore();
    if (newOptions) {
      setLocalRecipeOptions(prev => ({
        breakfast: [...prev.breakfast, ...newOptions.breakfast],
        lunch: [...prev.lunch, ...newOptions.lunch],
        dinner: [...prev.dinner, ...newOptions.dinner],
      }));
      // Reset index to show new options
      setCurrentIndex(currentOptions.length);
    }
  };

  if (!currentRecipe && !allComplete && !needsMoreOptions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('mealSwiper.loading', 'Indlæser retter...')}</p>
      </div>
    );
  }

  // Show "Generate more" UI when out of options
  if (needsMoreOptions && onGenerateMore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <div className="text-6xl mb-4">🤔</div>
        <h2 className="text-xl font-bold mb-2">
          {t('mealSwiper.noMoreOptions', 'Ingen flere forslag')}
        </h2>
        <p className="text-muted-foreground mb-2">
          Du har valgt {selectedMeals[currentMealType].length} af {durationDays} {mealTypeLabels[currentMealType].toLowerCase()}-retter.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {t('mealSwiper.generateMoreDesc', 'Vil du have 10 nye forslag at vælge imellem?')}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Annuller')}
          </Button>
          <Button 
            variant="hero" 
            onClick={handleGenerateMore}
            disabled={generatingMore}
          >
            {generatingMore ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {generatingMore ? 'Genererer...' : 'Generer 10 nye'}
          </Button>
        </div>
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
                {mealTypeLabels[type]} ({selectedMeals[type].length}/{getMealsNeeded(type)})
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
            <div className="relative h-48 bg-muted overflow-hidden">
              {images[currentRecipe.id] ? (
                <img
                  src={images[currentRecipe.id]}
                  alt={currentRecipe.title}
                  className="w-full h-full object-cover animate-in fade-in duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <span className="text-5xl mb-2">🍽️</span>
                  {loadingImages[currentRecipe.id] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('mealSwiper.imageLoading', 'Billede indlæses...')}</span>
                    </div>
                  )}
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
