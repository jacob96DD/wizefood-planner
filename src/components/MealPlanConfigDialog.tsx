import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Sparkles, Loader2, ChefHat, Clock, Utensils, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMealPlanPreferences,
  type FixedMeal,
  type MealException,
  type ExtraCalories,
} from '@/hooks/useMealPlanPreferences';
import { FridgeScanner } from '@/components/FridgeScanner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MealPlanConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => void;
  generating: boolean;
  profile?: {
    daily_calories?: number | null;
    daily_protein_target?: number | null;
    daily_carbs_target?: number | null;
    daily_fat_target?: number | null;
  };
}

const COOKING_STYLES = [
  { value: 'daily', label: 'Lav mad hver dag', icon: '🍳' },
  { value: 'meal_prep_2', label: '2 retter til ugen', icon: '📦' },
  { value: 'meal_prep_3', label: '3-4 retter til ugen', icon: '📦📦' },
  { value: 'meal_prep_4', label: '4+ retter til ugen', icon: '📦📦📦' },
];

const DAYS = [
  { value: 'all', label: 'Alle dage' },
  { value: 'monday', label: 'Mandag' },
  { value: 'tuesday', label: 'Tirsdag' },
  { value: 'wednesday', label: 'Onsdag' },
  { value: 'thursday', label: 'Torsdag' },
  { value: 'friday', label: 'Fredag' },
  { value: 'saturday', label: 'Lørdag' },
  { value: 'sunday', label: 'Søndag' },
];

const MEALS = [
  { value: 'breakfast', label: 'Morgenmad' },
  { value: 'lunch', label: 'Frokost' },
  { value: 'dinner', label: 'Aftensmad' },
];

export function MealPlanConfigDialog({
  open,
  onOpenChange,
  onGenerate,
  generating,
  profile,
}: MealPlanConfigDialogProps) {
  const { t } = useTranslation();
  const { preferences, loading, saving, savePreferences, calculateAdjustedMacros } =
    useMealPlanPreferences();

  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [showAddFixedMeal, setShowAddFixedMeal] = useState(false);
  const [showAddException, setShowAddException] = useState(false);
  const [showAddExtraCalories, setShowAddExtraCalories] = useState(false);
  const [showFridgeScanner, setShowFridgeScanner] = useState(false);

  // New item forms
  const [newFixedMeal, setNewFixedMeal] = useState<Partial<FixedMeal>>({
    day: 'all',
    meal: 'breakfast',
    description: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [newException, setNewException] = useState<Partial<MealException>>({
    day: 'saturday',
    meal: 'dinner',
    type: 'cheat_meal',
    description: '',
  });
  const [newExtraCalories, setNewExtraCalories] = useState<Partial<ExtraCalories>>({
    description: '',
    calories_per_week: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  const adjustedMacros = profile ? calculateAdjustedMacros(profile) : null;

  const handleSaveAndGenerate = async () => {
    const success = await savePreferences(localPrefs);
    if (success) {
      onGenerate();
    }
  };

  const addFixedMeal = () => {
    if (!newFixedMeal.description) return;
    setLocalPrefs(prev => ({
      ...prev,
      fixed_meals: [...prev.fixed_meals, newFixedMeal as FixedMeal],
    }));
    setNewFixedMeal({
      day: 'all',
      meal: 'breakfast',
      description: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setShowAddFixedMeal(false);
  };

  const removeFixedMeal = (index: number) => {
    setLocalPrefs(prev => ({
      ...prev,
      fixed_meals: prev.fixed_meals.filter((_, i) => i !== index),
    }));
  };

  const addException = () => {
    setLocalPrefs(prev => ({
      ...prev,
      exceptions: [...prev.exceptions, newException as MealException],
    }));
    setNewException({
      day: 'saturday',
      meal: 'dinner',
      type: 'cheat_meal',
      description: '',
    });
    setShowAddException(false);
  };

  const removeException = (index: number) => {
    setLocalPrefs(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter((_, i) => i !== index),
    }));
  };

  const addExtraCaloriesItem = () => {
    if (!newExtraCalories.description) return;
    setLocalPrefs(prev => ({
      ...prev,
      extra_calories: [...prev.extra_calories, newExtraCalories as ExtraCalories],
    }));
    setNewExtraCalories({
      description: '',
      calories_per_week: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setShowAddExtraCalories(false);
  };

  const removeExtraCalories = (index: number) => {
    setLocalPrefs(prev => ({
      ...prev,
      extra_calories: prev.extra_calories.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Konfigurer madplan
          </DialogTitle>
          <DialogDescription>
            Tilpas din madplan til dit liv, og generer derefter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fridge Scanner */}
          <Collapsible open={showFridgeScanner} onOpenChange={setShowFridgeScanner}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                📷 Scan køleskab
                <Badge variant="secondary" className="ml-auto text-xs">Ny!</Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <FridgeScanner onComplete={() => setShowFridgeScanner(false)} />
            </CollapsibleContent>
          </Collapsible>

          {/* Cooking Style */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Madlavningsstil</Label>
            <div className="grid grid-cols-2 gap-2">
              {COOKING_STYLES.map(style => (
                <button
                  key={style.value}
                  onClick={() =>
                    setLocalPrefs(prev => ({
                      ...prev,
                      cooking_style: style.value as typeof prev.cooking_style,
                    }))
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    localPrefs.cooking_style === style.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-lg">{style.icon}</span>
                  <p className="text-sm font-medium mt-1">{style.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Meals to include */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Hvilke måltider?</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>🌅 Morgenmad</span>
                <Switch
                  checked={!localPrefs.skip_breakfast}
                  onCheckedChange={checked =>
                    setLocalPrefs(prev => ({ ...prev, skip_breakfast: !checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>☀️ Frokost</span>
                <Switch
                  checked={!localPrefs.skip_lunch}
                  onCheckedChange={checked =>
                    setLocalPrefs(prev => ({ ...prev, skip_lunch: !checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>🌙 Aftensmad</span>
                <Switch
                  checked={!localPrefs.skip_dinner}
                  onCheckedChange={checked =>
                    setLocalPrefs(prev => ({ ...prev, skip_dinner: !checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Fixed Meals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Faste måltider</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddFixedMeal(!showAddFixedMeal)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Tilføj
              </Button>
            </div>

            {localPrefs.fixed_meals.map((meal, idx) => (
              <Card key={idx} className="bg-muted/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{meal.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {DAYS.find(d => d.value === meal.day)?.label} ·{' '}
                      {MEALS.find(m => m.value === meal.meal)?.label} · {meal.calories} kcal
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFixedMeal(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {showAddFixedMeal && (
              <Card className="border-primary/50">
                <CardContent className="p-3 space-y-3">
                  <Input
                    placeholder="f.eks. Franskbrød med nutella"
                    value={newFixedMeal.description}
                    onChange={e =>
                      setNewFixedMeal(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={newFixedMeal.day}
                      onValueChange={v =>
                        setNewFixedMeal(prev => ({ ...prev, day: v as FixedMeal['day'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newFixedMeal.meal}
                      onValueChange={v =>
                        setNewFixedMeal(prev => ({ ...prev, meal: v as FixedMeal['meal'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEALS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Kcal</Label>
                      <Input
                        type="number"
                        value={newFixedMeal.calories || ''}
                        onChange={e =>
                          setNewFixedMeal(prev => ({
                            ...prev,
                            calories: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Protein</Label>
                      <Input
                        type="number"
                        value={newFixedMeal.protein || ''}
                        onChange={e =>
                          setNewFixedMeal(prev => ({
                            ...prev,
                            protein: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Kulh.</Label>
                      <Input
                        type="number"
                        value={newFixedMeal.carbs || ''}
                        onChange={e =>
                          setNewFixedMeal(prev => ({
                            ...prev,
                            carbs: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fedt</Label>
                      <Input
                        type="number"
                        value={newFixedMeal.fat || ''}
                        onChange={e =>
                          setNewFixedMeal(prev => ({
                            ...prev,
                            fat: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={addFixedMeal} className="w-full">
                    Tilføj fast måltid
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Exceptions (Cheat meals etc) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Undtagelser</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddException(!showAddException)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Tilføj
              </Button>
            </div>

            {localPrefs.exceptions.map((exc, idx) => (
              <Badge key={idx} variant="secondary" className="mr-2">
                {DAYS.find(d => d.value === exc.day)?.label} {MEALS.find(m => m.value === exc.meal)?.label}: {exc.type === 'cheat_meal' ? '🍕 Cheat' : exc.type}
                <button onClick={() => removeException(idx)} className="ml-2">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {showAddException && (
              <Card className="border-primary/50">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={newException.day}
                      onValueChange={v =>
                        setNewException(prev => ({ ...prev, day: v as MealException['day'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.filter(d => d.value !== 'all').map(d => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newException.meal}
                      onValueChange={v =>
                        setNewException(prev => ({ ...prev, meal: v as MealException['meal'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEALS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select
                    value={newException.type}
                    onValueChange={v =>
                      setNewException(prev => ({ ...prev, type: v as MealException['type'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheat_meal">🍕 Cheat meal</SelectItem>
                      <SelectItem value="skip">⏭️ Spring over</SelectItem>
                      <SelectItem value="restaurant">🍽️ Restaurant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addException} className="w-full">
                    Tilføj undtagelse
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Extra calories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Ekstra kalorier (real-life)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddExtraCalories(!showAddExtraCalories)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Tilføj
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ting udenfor madplanen (øl, snacks, kaffe med mælk etc.)
            </p>

            {localPrefs.extra_calories.map((item, idx) => (
              <Card key={idx} className="bg-muted/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.calories_per_week} kcal/uge ≈ {Math.round(item.calories_per_week / 7)} kcal/dag
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeExtraCalories(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {showAddExtraCalories && (
              <Card className="border-primary/50">
                <CardContent className="p-3 space-y-3">
                  <Input
                    placeholder="f.eks. 10 øl om ugen"
                    value={newExtraCalories.description}
                    onChange={e =>
                      setNewExtraCalories(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Kcal/uge</Label>
                      <Input
                        type="number"
                        value={newExtraCalories.calories_per_week || ''}
                        onChange={e =>
                          setNewExtraCalories(prev => ({
                            ...prev,
                            calories_per_week: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Protein/uge</Label>
                      <Input
                        type="number"
                        value={newExtraCalories.protein || ''}
                        onChange={e =>
                          setNewExtraCalories(prev => ({
                            ...prev,
                            protein: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={addExtraCaloriesItem} className="w-full">
                    Tilføj ekstra kalorier
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cooking time */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tilberedningstid
            </Label>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Hverdage max</span>
                  <span className="font-medium">{localPrefs.weekday_max_cook_time} min</span>
                </div>
                <Slider
                  value={[localPrefs.weekday_max_cook_time]}
                  onValueChange={([v]) =>
                    setLocalPrefs(prev => ({ ...prev, weekday_max_cook_time: v }))
                  }
                  min={10}
                  max={90}
                  step={5}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Weekend max</span>
                  <span className="font-medium">{localPrefs.weekend_max_cook_time} min</span>
                </div>
                <Slider
                  value={[localPrefs.weekend_max_cook_time]}
                  onValueChange={([v]) =>
                    setLocalPrefs(prev => ({ ...prev, weekend_max_cook_time: v }))
                  }
                  min={15}
                  max={180}
                  step={5}
                />
              </div>
            </div>
          </div>

          {/* Alternatives */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Alternativer til swipe-valg
            </Label>
            <p className="text-xs text-muted-foreground">
              Generer flere forslag per måltid, så du kan vælge din favorit.
            </p>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setLocalPrefs(prev => ({ ...prev, generate_alternatives: n }))}
                  className={`flex-1 py-2 rounded-lg border font-medium transition-all ${
                    localPrefs.generate_alternatives === n
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {n === 0 ? 'Ingen' : `+${n}`}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {adjustedMacros && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-2">Tilgængelig til madplan:</p>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="font-bold text-primary">{adjustedMacros.availableCalories}</p>
                    <p className="text-xs text-muted-foreground">kcal/dag</p>
                  </div>
                  <div>
                    <p className="font-bold">{adjustedMacros.availableProtein}g</p>
                    <p className="text-xs text-muted-foreground">protein</p>
                  </div>
                  <div>
                    <p className="font-bold">{adjustedMacros.availableCarbs}g</p>
                    <p className="text-xs text-muted-foreground">kulh.</p>
                  </div>
                  <div>
                    <p className="font-bold">{adjustedMacros.availableFat}g</p>
                    <p className="text-xs text-muted-foreground">fedt</p>
                  </div>
                </div>
                {(adjustedMacros.extraCaloriesPerDay > 0 || adjustedMacros.fixedCaloriesPerDay > 0) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Fratrukket: {adjustedMacros.extraCaloriesPerDay} kcal (real-life) + {adjustedMacros.fixedCaloriesPerDay} kcal (faste måltider)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Annuller
          </Button>
          <Button
            onClick={handleSaveAndGenerate}
            disabled={generating || saving}
            className="flex-1"
          >
            {generating || saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Genererer...' : 'Generer madplan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
