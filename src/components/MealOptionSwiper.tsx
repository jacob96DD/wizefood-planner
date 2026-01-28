import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Flame, Loader2, ChevronLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

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
  key_ingredients?: string[];
  uses_offers?: { offer_text: string; store: string; savings: number }[];
  offers?: { offer_text?: string; store?: string; savings?: number }[];
  estimated_price?: number;
  imageUrl?: string;
  image_url?: string;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type CookingStyle = 'daily' | 'meal_prep_2' | 'meal_prep_3' | 'meal_prep_4';
export type Rating = 'love' | 'like' | 'dislike' | 'hate';

interface MealOptionSwiperProps {
  recipes: MealRecipe[];
  recipesNeeded: number;
  macroTargets: MacroTargets;
  onComplete: (selectedMeals: MealRecipe[]) => void;
  onCancel: () => void;
  onGenerateMore?: () => Promise<MealRecipe[] | null>;
  generatingMore?: boolean;
}

export function MealOptionSwiper({
  recipes,
  recipesNeeded,
  macroTargets,
  onComplete,
  onCancel,
  onGenerateMore,
  generatingMore = false,
}: MealOptionSwiperProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState<MealRecipe[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [localRecipes, setLocalRecipes] = useState(recipes);

  // Update local recipes when recipes prop changes
  useEffect(() => {
    setLocalRecipes(recipes);
  }, [recipes]);

  const currentRecipe = localRecipes[currentIndex];
  const totalSelected = selectedMeals.length;
  const needsMoreOptions = currentIndex >= localRecipes.length && totalSelected < recipesNeeded;
  const allComplete = totalSelected >= recipesNeeded;

  // Calculate current macro averages from selected meals (PER PORTION)
  const calculateCurrentMacros = useCallback(() => {
    if (selectedMeals.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    // VIGTIGT: Beregn per-portion for hver ret, IKKE totaler
    const perPortionTotals = selectedMeals.reduce(
      (sum, meal) => {
        const servings = meal.servings || 1;
        return {
          calories: sum.calories + Math.round((meal.calories || 0) / servings),
          protein: sum.protein + Math.round((meal.protein || 0) / servings),
          carbs: sum.carbs + Math.round((meal.carbs || 0) / servings),
          fat: sum.fat + Math.round((meal.fat || 0) / servings),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const count = selectedMeals.length;
    return {
      calories: Math.round(perPortionTotals.calories / count),
      protein: Math.round(perPortionTotals.protein / count),
      carbs: Math.round(perPortionTotals.carbs / count),
      fat: Math.round(perPortionTotals.fat / count),
    };
  }, [selectedMeals]);

  // Generate images for ALL recipes in background
  useEffect(() => {
    const generateAllImages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const recipesToGenerate = localRecipes.filter(
        r => !images[r.id] && !loadingImages[r.id]
      );

      if (recipesToGenerate.length === 0) return;

      const batchSize = 3;
      for (let i = 0; i < recipesToGenerate.length; i += batchSize) {
        const batch = recipesToGenerate.slice(i, i + batchSize);
        
        setLoadingImages(prev => {
          const next = { ...prev };
          batch.forEach(r => { next[r.id] = true; });
          return next;
        });

        supabase.functions.invoke('generate-meal-images', {
          body: { recipes: batch },
        }).then(({ data, error }) => {
          if (error) {
            console.error('Image generation error:', error);
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
  }, [localRecipes]);

  // Save swipe to database for AI learning
  const saveSwipe = async (recipe: MealRecipe, rating: Rating) => {
    if (!user) return;

    try {
      // Map rating to direction for backwards compatibility
      const directionMap: Record<Rating, string> = {
        love: 'up',
        like: 'right',
        dislike: 'left',
        hate: 'down',
      };

      // Extract key ingredients from recipe
      const keyIngredients = recipe.key_ingredients || 
        recipe.ingredients?.slice(0, 5).map(i => i.name) || [];

      await supabase.from('swipes').insert({
        user_id: user.id,
        direction: directionMap[rating],
        rating: rating,
        meal_plan_recipe_title: recipe.title,
        meal_plan_key_ingredients: keyIngredients,
      });
    } catch (error) {
      console.error('Error saving swipe:', error);
    }
  };

  const handleRate = async (rating: Rating) => {
    if (!currentRecipe) return;

    // Map rating to visual direction
    const directionMap: Record<Rating, 'left' | 'right' | 'up' | 'down'> = {
      love: 'up',
      like: 'right',
      dislike: 'left',
      hate: 'down',
    };

    setSwipeDirection(directionMap[rating]);

    // Save swipe for AI learning
    await saveSwipe(currentRecipe, rating);

    setTimeout(() => {
      const isPositive = rating === 'like' || rating === 'love';
      
      if (isPositive) {
        // KRITISK FIX: Opret det nye array FØRST og brug det direkte
        const newSelectedMeals = [...selectedMeals, currentRecipe];
        setSelectedMeals(newSelectedMeals);

        toast({
          title: rating === 'love' ? '🔥 Livret!' : '👍 Tilføjet!',
          description: currentRecipe.title,
        });

        // Check if we have enough meals - brug det NYE array direkte!
        if (newSelectedMeals.length >= recipesNeeded) {
          setSwipeDirection(null);
          // KRITISK FIX: Send det nye array DIREKTE til completion
          setTimeout(() => handleCompleteWithMeals(newSelectedMeals), 100);
          return;
        }
      } else {
        toast({
          title: rating === 'hate' ? '🤮 Noteret!' : '👎 Sprunget over',
          description: `${currentRecipe.title} - vi husker det`,
          variant: rating === 'hate' ? 'destructive' : 'default',
        });
      }

      // Move to next recipe
      if (currentIndex < localRecipes.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }

      setSwipeDirection(null);
    }, 200);
  };

  // NY FUNKTION: Tager meals som parameter for at undgå race condition
  const handleCompleteWithMeals = (meals: MealRecipe[]) => {
    const mealsWithImages = meals.map(meal => ({
      ...meal,
      image_url: images[meal.id] || meal.image_url || meal.imageUrl || null,
      imageUrl: images[meal.id] || meal.imageUrl || meal.image_url || null,
    }));
    
    toast({
      title: t('mealSwiper.complete', 'Madplan klar!'),
      description: t('mealSwiper.completeDesc', 'Dine valgte retter er gemt'),
    });
    onComplete(mealsWithImages);
  };

  // Behold original handleComplete for "Opret madplan" knappen
  const handleComplete = () => {
    handleCompleteWithMeals(selectedMeals);
  };

  // Handle generate more options
  const handleGenerateMore = async () => {
    if (!onGenerateMore) return;
    
    const newRecipes = await onGenerateMore();
    if (newRecipes) {
      setLocalRecipes(prev => [...prev, ...newRecipes]);
    }
  };

  const currentMacros = calculateCurrentMacros();

  // Rating actions configuration
  const ratingActions: { rating: Rating; emoji: string; label: string; colors: string }[] = [
    {
      rating: 'hate',
      emoji: '🤮',
      label: 'Aldrig!',
      colors: 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white',
    },
    {
      rating: 'dislike',
      emoji: '👎',
      label: 'Nej tak',
      colors: 'bg-orange-500/10 border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white',
    },
    {
      rating: 'like',
      emoji: '👍',
      label: 'Ja tak',
      colors: 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white',
    },
    {
      rating: 'love',
      emoji: '🔥',
      label: 'Livret!',
      colors: 'bg-pink-500/10 border-pink-500/50 text-pink-500 hover:bg-pink-500 hover:text-white',
    },
  ];

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
          Du har valgt {totalSelected} af {recipesNeeded} retter.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {t('mealSwiper.generateMoreDesc', 'Vil du have flere forslag at vælge imellem?')}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Annuller')}
          </Button>
          <Button 
            variant="default" 
            onClick={handleGenerateMore}
            disabled={generatingMore}
          >
            {generatingMore ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {generatingMore ? 'Genererer...' : 'Generer flere'}
          </Button>
        </div>
      </div>
    );
  }

  // Auto-continue when all meals are selected
  useEffect(() => {
    if (allComplete && selectedMeals.length >= recipesNeeded) {
      const timer = setTimeout(() => {
        handleCompleteWithMeals(selectedMeals);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allComplete, selectedMeals, recipesNeeded]);

  if (allComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">{t('mealSwiper.allDone', 'Alle retter valgt!')}</h2>
        <p className="text-muted-foreground mb-4">
          {totalSelected} retter valgt
        </p>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2">
          {t('mealSwiper.creatingPlan', 'Opretter din madplan...')}
        </p>
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
            {totalSelected}/{recipesNeeded} retter valgt
          </span>
        </div>
        
        <Progress value={(totalSelected / recipesNeeded) * 100} className="h-2" />
        
        <div className="flex justify-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Ret {currentIndex + 1} af {localRecipes.length}</span>
        </div>
      </div>

      {/* Swipe Card */}
      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        <Card 
          className={`flex-1 overflow-hidden transition-all duration-200 rounded-3xl shadow-lg ${
            swipeDirection === 'left' ? '-translate-x-full rotate-[-10deg] opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full rotate-[10deg] opacity-0' :
            swipeDirection === 'up' ? '-translate-y-full scale-110 opacity-0' :
            swipeDirection === 'down' ? 'translate-y-full scale-90 opacity-0' : ''
          }`}
        >
          <CardContent className="p-0 h-full flex flex-col">
            {/* Image */}
            <div className="relative h-[45vh] bg-muted overflow-hidden">
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
                      <span>Billede indlæses...</span>
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

              {/* Macros - VIGTIGT: Divider med servings for at vise PER PORTION */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-sm font-bold">{Math.round(currentRecipe.calories / (currentRecipe.servings || 1))}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{Math.round(currentRecipe.protein / (currentRecipe.servings || 1))}g</div>
                  <div className="text-xs text-muted-foreground">protein</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{Math.round(currentRecipe.carbs / (currentRecipe.servings || 1))}g</div>
                  <div className="text-xs text-muted-foreground">kulh.</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-sm font-bold">{Math.round(currentRecipe.fat / (currentRecipe.servings || 1))}g</div>
                  <div className="text-xs text-muted-foreground">fedt</div>
                </div>
              </div>

              {/* Time & Price */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{(currentRecipe.prep_time || 0) + (currentRecipe.cook_time || 0)} min</span>
                </div>
                {currentRecipe.estimated_price && (
                  <span className="font-medium text-foreground">
                    ~{currentRecipe.estimated_price} kr
                  </span>
                )}
              </div>

              {/* Offers - marked as estimates since they come from AI */}
              {(currentRecipe.uses_offers?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentRecipe.uses_offers?.slice(0, 2).map((offer, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      💰 {offer.store}: ~{offer.savings} kr (estimat)
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4-level Rating Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-4 pb-2">
          {ratingActions.map(({ rating, emoji, label, colors }) => (
            <Button
              key={rating}
              variant="outline"
              onClick={() => handleRate(rating)}
              className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all ${colors}`}
            >
              <span className="text-2xl mb-1">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Legacy exports for backwards compatibility
export interface RecipeOptions {
  breakfast: MealRecipe[];
  lunch: MealRecipe[];
  dinner: MealRecipe[];
}
