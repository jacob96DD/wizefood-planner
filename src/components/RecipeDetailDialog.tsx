import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Flame, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeDetail {
  id: string;
  title: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags?: string[];
  image_url?: string | null;
}

interface RecipeDetailDialogProps {
  recipe: RecipeDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  const { t } = useTranslation();

  if (!recipe) return null;

  const totalTime = recipe.prep_time + (recipe.cook_time || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {/* Hero Image */}
        <div className="relative h-48 bg-muted">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
          
          {/* Tags overlay */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
              {recipe.tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs bg-background/80">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[calc(90vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Title */}
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl">{recipe.title}</DialogTitle>
              {recipe.description && (
                <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
              )}
            </DialogHeader>

            {/* Macros - Per portion (backend sender allerede per-portion værdier) */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">📊 Per portion</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-3 bg-muted rounded-xl">
                  <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-sm font-bold">{recipe.calories}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-xl">
                  <div className="text-sm font-bold">{recipe.protein}g</div>
                  <div className="text-xs text-muted-foreground">protein</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-xl">
                  <div className="text-sm font-bold">{recipe.carbs}g</div>
                  <div className="text-xs text-muted-foreground">kulhydrat</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-xl">
                  <div className="text-sm font-bold">{recipe.fat}g</div>
                  <div className="text-xs text-muted-foreground">fedt</div>
                </div>
              </div>
            </div>

            {/* Macros - Samlet (hvis flere portioner) */}
            {recipe.servings > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">📦 Samlet ({recipe.servings} portioner)</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-primary/5 rounded-lg">
                    <div className="text-sm font-bold">{recipe.calories * recipe.servings}</div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </div>
                  <div className="text-center p-2 bg-primary/5 rounded-lg">
                    <div className="text-sm font-bold">{recipe.protein * recipe.servings}g</div>
                    <div className="text-xs text-muted-foreground">protein</div>
                  </div>
                  <div className="text-center p-2 bg-primary/5 rounded-lg">
                    <div className="text-sm font-bold">{recipe.carbs * recipe.servings}g</div>
                    <div className="text-xs text-muted-foreground">kulhydrat</div>
                  </div>
                  <div className="text-center p-2 bg-primary/5 rounded-lg">
                    <div className="text-sm font-bold">{recipe.fat * recipe.servings}g</div>
                    <div className="text-xs text-muted-foreground">fedt</div>
                  </div>
                </div>
              </div>
            )}

            {/* Time & Servings */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{totalTime} min</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} {t('recipe.servings', 'portioner')}</span>
              </div>
            </div>

            {/* Ingredients - SAMLET indkøb */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                🛒 {t('recipe.ingredients', 'Indkøbsliste')}
                <span className="text-xs font-normal text-muted-foreground">
                  (samlet til {recipe.servings} {recipe.servings === 1 ? 'portion' : 'portioner'})
                </span>
              </h4>
              <ul className="space-y-1.5 text-sm">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                    <span>
                      {ing.amount} {ing.unit} {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                💡 Dette er den samlede mængde til alle {recipe.servings} portioner
              </p>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                📝 {t('recipe.instructions', 'Fremgangsmåde')}
              </h4>
              <ol className="space-y-3 text-sm">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
