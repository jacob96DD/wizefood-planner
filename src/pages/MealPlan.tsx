import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Recipe } from '@/lib/supabase';

const weekDays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export default function MealPlan() {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchLikedRecipes();
    }
  }, [user]);

  const fetchLikedRecipes = async () => {
    if (!user) return;

    const { data: swipes } = await supabase
      .from('swipes')
      .select('recipe_id')
      .eq('user_id', user.id)
      .in('direction', ['right', 'up']);

    if (swipes && swipes.length > 0) {
      const recipeIds = swipes.map(s => s.recipe_id);
      const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipes) {
        setLikedRecipes(recipes.map(r => ({
          ...r,
          ingredients: r.ingredients as Recipe['ingredients'],
          instructions: r.instructions as Recipe['instructions'],
        })));
      }
    }
  };

  // Generate mock meal plan from liked recipes
  const generateMealPlan = () => {
    return weekDays.map((_, index) => ({
      breakfast: likedRecipes[index % likedRecipes.length] || null,
      lunch: likedRecipes[(index + 1) % likedRecipes.length] || null,
      dinner: likedRecipes[(index + 2) % likedRecipes.length] || null,
    }));
  };

  const mealPlan = likedRecipes.length > 0 ? generateMealPlan() : [];
  const selectedMeals = mealPlan[selectedDay] || { breakfast: null, lunch: null, dinner: null };

  const totalCalories = [selectedMeals.breakfast, selectedMeals.lunch, selectedMeals.dinner]
    .filter(Boolean)
    .reduce((sum, meal) => sum + (meal?.calories || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Din Madplan</h1>
            <Button variant="ghost" size="sm" className="text-primary">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generer
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek - 1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-medium">
              Uge {Math.abs(currentWeek) + 1} - {currentWeek === 0 ? 'Denne uge' : currentWeek > 0 ? 'Næste uge' : 'Sidste uge'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek + 1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
            {weekDays.map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={`flex-1 min-w-[44px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  selectedDay === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 pt-6">
        {likedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">Ingen opskrifter valgt endnu</h2>
            <p className="text-muted-foreground mb-6">Swipe på opskrifter for at bygge din madplan</p>
            <Button variant="hero" onClick={() => navigate('/home')}>Find opskrifter</Button>
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dagens kalorier</p>
                    <p className="text-2xl font-bold">{totalCalories} kcal</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">Spar 45 kr</Badge>
                    <p className="text-xs text-muted-foreground">Fra tilbud</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {[
                { time: 'Morgenmad', meal: selectedMeals.breakfast, icon: '🌅' },
                { time: 'Frokost', meal: selectedMeals.lunch, icon: '☀️' },
                { time: 'Aftensmad', meal: selectedMeals.dinner, icon: '🌙' },
              ].map(({ time, meal, icon }) => (
                <Card key={time} className="overflow-hidden">
                  <CardContent className="p-0">
                    {meal ? (
                      <div className="flex">
                        <img src={meal.image_url || ''} alt={meal.title} className="w-24 h-24 object-cover" />
                        <div className="flex-1 p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>{icon}</span>
                            <span>{time}</span>
                          </div>
                          <h3 className="font-semibold line-clamp-1">{meal.title}</h3>
                          <p className="text-sm text-muted-foreground">{meal.calories} kcal · {meal.prep_time}+ min</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <span className="text-2xl mb-2 block">{icon}</span>
                        <p className="text-sm">{time} - Tilføj opskrift</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Button variant="hero" size="xl" className="w-full" onClick={() => navigate('/shopping-list')}>
                <ShoppingCart className="w-5 h-5" />
                <span>Generer indkøbsliste</span>
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
