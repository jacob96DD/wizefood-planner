import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Sparkles, Loader2, ChefHat, Clock, Utensils, Camera, Wand2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  useMealPlanPreferences,
} from '@/hooks/useMealPlanPreferences';
import { FridgeScanner } from '@/components/FridgeScanner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    real_life_description?: string | null;
    real_life_calories_per_week?: number | null;
    real_life_protein_per_week?: number | null;
    real_life_carbs_per_week?: number | null;
    real_life_fat_per_week?: number | null;
    budget_per_week?: number | null;
  };
}

const COOKING_STYLES = [
  { value: 'daily', label: 'Lav mad hver dag', icon: '🍳' },
  { value: 'meal_prep_2', label: '2 retter til ugen', icon: '📦' },
  { value: 'meal_prep_3', label: '3-4 retter til ugen', icon: '📦📦' },
  { value: 'meal_prep_4', label: '4+ retter til ugen', icon: '📦📦📦' },
];

interface RealLifeEstimate {
  calories_per_week: number;
  calories_per_day: number;
  protein: number;
  carbs: number;
  fat: number;
}

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
  const [showFridgeScanner, setShowFridgeScanner] = useState(false);
  
  // Real-life section - now loads from profile
  const [realLifeDescription, setRealLifeDescription] = useState('');
  const [isCalculatingRealLife, setIsCalculatingRealLife] = useState(false);
  const [realLifeEstimate, setRealLifeEstimate] = useState<RealLifeEstimate | null>(null);
  const [useProfileRealLife, setUseProfileRealLife] = useState(true);

  useEffect(() => {
    setLocalPrefs({
      ...preferences,
      max_weekly_budget: preferences.max_weekly_budget || profile?.budget_per_week || 800,
    });
    
    // Load real-life data from profile first
    if (profile?.real_life_calories_per_week && useProfileRealLife) {
      setRealLifeDescription(profile.real_life_description || '');
      setRealLifeEstimate({
        calories_per_week: profile.real_life_calories_per_week,
        calories_per_day: Math.round(profile.real_life_calories_per_week / 7),
        protein: profile.real_life_protein_per_week || 0,
        carbs: profile.real_life_carbs_per_week || 0,
        fat: profile.real_life_fat_per_week || 0,
      });
    } else if (preferences.extra_calories && preferences.extra_calories.length > 0) {
      // Fallback to preferences extra_calories
      const descriptions = preferences.extra_calories.map(item => item.description).join('. ');
      setRealLifeDescription(descriptions);
      
      const totals = preferences.extra_calories.reduce((acc, item) => ({
        calories_per_week: acc.calories_per_week + (item.calories_per_week || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
      }), { calories_per_week: 0, protein: 0, carbs: 0, fat: 0 });
      
      if (totals.calories_per_week > 0) {
        setRealLifeEstimate({
          ...totals,
          calories_per_day: Math.round(totals.calories_per_week / 7),
        });
      }
    }
  }, [preferences, profile, useProfileRealLife]);

  // Calculate adjusted macros with real-life estimate
  const getAdjustedMacros = () => {
    if (!profile) return null;
    
    // Use the estimate if available, otherwise calculate from preferences
    const extraCaloriesPerDay = realLifeEstimate?.calories_per_day || 0;
    const extraProteinPerDay = realLifeEstimate ? Math.round(realLifeEstimate.protein / 7) : 0;
    const extraCarbsPerDay = realLifeEstimate ? Math.round(realLifeEstimate.carbs / 7) : 0;
    const extraFatPerDay = realLifeEstimate ? Math.round(realLifeEstimate.fat / 7) : 0;
    
    return {
      availableCalories: Math.max(0, (profile.daily_calories || 0) - extraCaloriesPerDay),
      availableProtein: Math.max(0, (profile.daily_protein_target || 0) - extraProteinPerDay),
      availableCarbs: Math.max(0, (profile.daily_carbs_target || 0) - extraCarbsPerDay),
      availableFat: Math.max(0, (profile.daily_fat_target || 0) - extraFatPerDay),
      extraCaloriesPerDay,
    };
  };

  const adjustedMacros = getAdjustedMacros();

  // AI estimation for free-text description
  const estimateFromDescription = async () => {
    if (!realLifeDescription.trim()) {
      toast.error('Skriv en beskrivelse først');
      return;
    }

    setIsCalculatingRealLife(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-calories', {
        body: { description: realLifeDescription },
      });

      if (error) throw error;

      setRealLifeEstimate({
        calories_per_week: data.calories_per_week,
        calories_per_day: data.calories_per_day,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      });

      // Update preferences with the new extra calories
      setLocalPrefs(prev => ({
        ...prev,
        extra_calories: [{
          description: realLifeDescription,
          calories_per_week: data.calories_per_week,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
        }],
        // Clear fixed meals as they're now part of the description
        fixed_meals: [],
        exceptions: [],
      }));

      toast.success('Estimeret! 🎉');
    } catch (error) {
      console.error('Error estimating calories:', error);
      toast.error('Kunne ikke estimere kalorier');
    } finally {
      setIsCalculatingRealLife(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    const success = await savePreferences(localPrefs);
    if (success) {
      onGenerate();
    }
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
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <FridgeScanner onComplete={() => setShowFridgeScanner(false)} />
            </CollapsibleContent>
          </Collapsible>

          {/* Cooking Style */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Mealprep/konventionel</Label>
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

          {/* Real-life - Kalorier at tage højde for */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">🍕 Real-life kalorier</Label>
              {profile?.real_life_calories_per_week && (
                <span className="text-xs text-muted-foreground">Fra din profil</span>
              )}
            </div>
            
            {/* Show profile real-life if available */}
            {profile?.real_life_calories_per_week && useProfileRealLife ? (
              <Card className="bg-muted/30 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">✨ Fra din profil:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive"
                      onClick={() => {
                        setUseProfileRealLife(false);
                        setRealLifeEstimate(null);
                        setRealLifeDescription('');
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Fjern for denne uge
                    </Button>
                  </div>
                  {profile.real_life_description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      "{profile.real_life_description}"
                    </p>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <span className="font-bold text-primary">{profile.real_life_calories_per_week}</span>
                      <p className="text-muted-foreground">kcal/uge</p>
                    </div>
                    <div>
                      <span className="font-bold">{profile.real_life_protein_per_week || 0}g</span>
                      <p className="text-muted-foreground">protein</p>
                    </div>
                    <div>
                      <span className="font-bold">{profile.real_life_carbs_per_week || 0}g</span>
                      <p className="text-muted-foreground">kulh.</p>
                    </div>
                    <div>
                      <span className="font-bold">{profile.real_life_fat_per_week || 0}g</span>
                      <p className="text-muted-foreground">fedt</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ≈ <span className="font-semibold">{Math.round(profile.real_life_calories_per_week / 7)} kcal/dag</span> fratrukket din madplan
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {profile?.real_life_calories_per_week 
                    ? 'Tilføj ekstra for denne uge, eller genaktiver profil-indstillingen:'
                    : 'Beskriv ting du spiser/drikker som IKKE skal være en del af madplanen:'}
                </p>
                
                {profile?.real_life_calories_per_week && !useProfileRealLife && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setUseProfileRealLife(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Brug profil-indstilling igen
                  </Button>
                )}
                
                <Textarea
                  placeholder="f.eks. Jeg spiser pizza om lørdagen og drikker 8 øl..."
                  value={realLifeDescription}
                  onChange={(e) => {
                    setRealLifeDescription(e.target.value);
                    if (realLifeEstimate) {
                      setRealLifeEstimate(null);
                    }
                  }}
                  rows={3}
                  className="resize-none"
                />
                
                <Button
                  variant="outline"
                  onClick={estimateFromDescription}
                  disabled={isCalculatingRealLife || !realLifeDescription.trim()}
                  className="w-full"
                >
                  {isCalculatingRealLife ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Udregn fra beskrivelse
                </Button>

                {/* Estimated results for this week */}
                {realLifeEstimate && !useProfileRealLife && (
                  <Card className="bg-muted/30 border-primary/20">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm mb-2">✨ Estimeret for denne uge:</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <span className="font-bold text-primary">{realLifeEstimate.calories_per_week}</span>
                          <p className="text-muted-foreground">kcal/uge</p>
                        </div>
                        <div>
                          <span className="font-bold">{realLifeEstimate.protein}g</span>
                          <p className="text-muted-foreground">protein</p>
                        </div>
                        <div>
                          <span className="font-bold">{realLifeEstimate.carbs}g</span>
                          <p className="text-muted-foreground">kulh.</p>
                        </div>
                        <div>
                          <span className="font-bold">{realLifeEstimate.fat}g</span>
                          <p className="text-muted-foreground">fedt</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        ≈ <span className="font-semibold">{realLifeEstimate.calories_per_day} kcal/dag</span> fratrukket
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
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

          {/* Max Budget */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Max ugentligt budget
            </Label>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">
                {localPrefs.max_weekly_budget >= 2000 ? 'Ubegrænset' : `${localPrefs.max_weekly_budget} kr`}
              </span>
            </div>
            <Slider
              value={[localPrefs.max_weekly_budget]}
              onValueChange={([v]) =>
                setLocalPrefs(prev => ({ ...prev, max_weekly_budget: v }))
              }
              min={200}
              max={2000}
              step={50}
            />
          </div>
          </div>


          {/* Summary */}
          {adjustedMacros && profile && (
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
                {adjustedMacros.extraCaloriesPerDay > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Fratrukket: {adjustedMacros.extraCaloriesPerDay} kcal/dag (real-life)
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
