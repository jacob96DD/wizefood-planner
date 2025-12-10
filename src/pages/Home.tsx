import { useNavigate } from 'react-router-dom';
import { RecipeCard } from '@/components/RecipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useRecipeStore } from '@/stores/recipeStore';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Heart } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, isOnboarded } = useAuthStore();
  const { getCurrentRecipe, swipe, likedRecipes, reset, recipes, currentIndex } = useRecipeStore();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (!isOnboarded) {
      navigate('/onboarding');
    }
  }, [user, isOnboarded, navigate]);

  const currentRecipe = getCurrentRecipe();
  const hasMoreRecipes = currentIndex < recipes.length;

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
            <RecipeCard recipe={currentRecipe} onSwipe={swipe} />
            <SwipeActions onSwipe={swipe} />
            
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
              <Button variant="outline" onClick={reset}>
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
