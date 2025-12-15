import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChefHat, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDiscover } from '@/hooks/useDiscover';
import { DiscoverCard } from '@/components/DiscoverCard';
import { DiscoverActions } from '@/components/DiscoverActions';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function Discover() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const {
    currentRecipe,
    loading,
    recordRating,
    resetProgress,
    swipedCount,
    totalRecipes,
    progress,
    isComplete,
    remainingCount,
  } = useDiscover();

  // Redirect til auth hvis ikke logget ind
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('discover.title', 'Discover')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {swipedCount}/{totalRecipes}
            </span>
            {swipedCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetProgress}
                className="h-8 w-8"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 pb-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      <main className="px-4 pt-4">
        {isComplete ? (
          // Færdig-tilstand
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {t('discover.complete', 'Du er færdig!')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {t('discover.completeDesc', 'Du har bedømt alle retter. Vi bruger dine præferencer til at lave bedre madplaner.')}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetProgress}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('discover.startOver', 'Start forfra')}
              </Button>
              <Button onClick={() => navigate('/meal-plan')}>
                {t('discover.goToMealPlan', 'Se madplan')}
              </Button>
            </div>
          </div>
        ) : currentRecipe ? (
          // Swipe interface
          <div className="max-w-sm mx-auto">
            <div className="mb-2 text-center">
              <p className="text-sm text-muted-foreground">
                {remainingCount} {t('discover.remaining', 'retter tilbage')}
              </p>
            </div>
            
            <DiscoverCard recipe={currentRecipe} onRate={recordRating} />
            
            <DiscoverActions onRate={recordRating} />

            <p className="text-center text-xs text-muted-foreground mt-2">
              {t('discover.hint', 'Swipe eller tryk på knapperne for at bedømme')}
            </p>
          </div>
        ) : (
          // Ingen retter
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ChefHat className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('discover.noRecipes', 'Ingen retter at vise')}
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
