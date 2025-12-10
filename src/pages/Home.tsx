import { useNavigate } from 'react-router-dom';
import { RecipeCard } from '@/components/RecipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useAuthStore } from '@/stores/authStore';
import { useRecipes, useSaveSwipe } from '@/hooks/useRecipes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Heart, Loader2 } from 'lucide-react';
import type { Recipe } from '@/lib/supabase';

export default function Home() {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading: authLoading } = useAuthStore();
  const { data: recipes, isLoading: recipesLoading, refetch } = useRecipes();
  const { saveSwipe } = useSaveSwipe();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isOnboarded) {
      navigate('/onboarding');
    }
  }, [user, isOnboarded, authLoading, navigate]);

  const currentRecipe = recipes?.[currentIndex] || null;
  const hasMoreRecipes = recipes && currentIndex < recipes.length;

  const handleSwipe = async (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!currentRecipe) return;

    // Save swipe to database
    await saveSwipe(currentRecipe.id, direction);

    // Track liked recipes locally
    if (direction === 'right' || direction === 'up') {
      setLikedRecipes(prev => [...prev, currentRecipe]);
    }

    // Move to next recipe
    setCurrentIndex(prev => prev + 1);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setLikedRecipes([]);
    refetch();
  };

  if (authLoading || recipesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-lg">🍳</span>
            </div>
            <span className="font-bold text-lg">WizeFood</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Heart className="w-4 h-4 mr-1.5" />
              <span className="text-sm">{likedRecipes.length}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pt-6">
        {hasMoreRecipes && currentRecipe ? (
          <>
            <RecipeCard recipe={currentRecipe} onSwipe={handleSwipe} />
            <SwipeActions onSwipe={handleSwipe} />
            
            {/* Instructions */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
              <span>← Nej</span>
              <span>↓ Aldrig</span>
              <span>↑ Super!</span>
              <span>→ Ja!</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Du har set alle opskrifter!</h2>
            <p className="text-muted-foreground mb-6">
              Du har liket {likedRecipes.length} opskrifter
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start forfra
              </Button>
              <Button variant="hero" onClick={() => navigate('/meal-plan')}>
                Se madplan
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
