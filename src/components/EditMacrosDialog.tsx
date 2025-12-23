import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

interface MacroValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ProfileData {
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: string | null;
  activityLevel?: string | null;
}

interface RealLifeData {
  caloriesPerWeek?: number | null;
  proteinPerWeek?: number | null;
  carbsPerWeek?: number | null;
  fatPerWeek?: number | null;
}

interface EditMacrosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: MacroValues;
  calculatedValues: MacroValues;
  dietaryGoal?: string;
  profileData?: ProfileData;
  realLifeData?: RealLifeData;
  onSave: (values: MacroValues) => void;
}

const activityMultipliers: Record<string, { multiplier: number; name: string }> = {
  sedentary: { multiplier: 1.2, name: 'Stillesiddende' },
  light: { multiplier: 1.375, name: 'Let aktiv' },
  moderate: { multiplier: 1.55, name: 'Moderat aktiv' },
  active: { multiplier: 1.725, name: 'Meget aktiv' },
  athlete: { multiplier: 1.9, name: 'Atlet' },
};

const goalNames: Record<string, string> = {
  lose: 'Vægttab',
  maintain: 'Vedligehold',
  gain: 'Vægtøgning',
};

// Dynamiske minimumskalorier baseret på makroværdier
// Protein: 6 kcal per gram som praktisk minimum (100g = 600 kcal, 200g = 1200 kcal)
// Kulhydrater: 5 kcal per gram som praktisk minimum (100g = 500 kcal, 200g = 1000 kcal)
// Fedt: 10 kcal per gram som praktisk minimum (80g = 800 kcal)
const getMinCaloriesForProtein = (protein: number): number => {
  return Math.round(protein * 6);
};

const getMinCaloriesForCarbs = (carbs: number): number => {
  return Math.round(carbs * 5);
};

const getMinCaloriesForFat = (fat: number): number => {
  return Math.round(fat * 10);
};

export function EditMacrosDialog({
  open,
  onOpenChange,
  currentValues,
  calculatedValues,
  dietaryGoal,
  profileData,
  realLifeData,
  onSave,
}: EditMacrosDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<MacroValues>(currentValues);

  useEffect(() => {
    setValues(currentValues);
  }, [currentValues, open]);

  const handleSave = () => {
    onSave(values);
    onOpenChange(false);
  };

  const handleReset = () => {
    // Genberegn fra profileData direkte
    if (profileData?.weightKg && profileData?.heightCm && profileData?.age) {
      const { weightKg, heightCm, age, gender, activityLevel } = profileData;

      // Mifflin-St Jeor BMR formula (mest præcis for moderne befolkninger)
      const bmr = gender === 'male'
        ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
        : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;

      const activity = activityMultipliers[activityLevel || 'moderate'];
      const tdee = bmr * activity.multiplier;

      let adjustedCalories = Math.round(tdee);
      if (dietaryGoal === 'lose') adjustedCalories -= 500;
      if (dietaryGoal === 'gain') adjustedCalories += 500;

      // Fratræk real-life kalorier
      const realLifeCaloriesPerDay = Math.round((realLifeData?.caloriesPerWeek || 0) / 7);
      const calories = adjustedCalories - realLifeCaloriesPerDay;

      // Makro-fordeling baseret på mål (beregnet fra FINALE kalorier)
      let proteinRatio = 0.25;
      let carbsRatio = 0.45;
      let fatRatio = 0.30;

      if (dietaryGoal === 'lose') {
        proteinRatio = 0.30;
        carbsRatio = 0.40;
        fatRatio = 0.30;
      } else if (dietaryGoal === 'gain') {
        proteinRatio = 0.30;
        carbsRatio = 0.45;
        fatRatio = 0.25;
      }

      setValues({
        calories,
        protein: Math.round((calories * proteinRatio) / 4),
        carbs: Math.round((calories * carbsRatio) / 4),
        fat: Math.round((calories * fatRatio) / 9),
      });
    } else {
      // Fallback til calculatedValues hvis ingen profileData
      setValues(calculatedValues);
    }
  };

  const handleChange = (field: keyof MacroValues, value: string) => {
    const numValue = parseInt(value) || 0;
    setValues(prev => ({ ...prev, [field]: numValue }));
  };

  // Validering - dynamisk baseret på værdier
  const minCaloriesFromProtein = getMinCaloriesForProtein(values.protein);
  const minCaloriesFromCarbs = getMinCaloriesForCarbs(values.carbs);
  const minCaloriesFromFat = getMinCaloriesForFat(values.fat);
  const practicalMinCalories = Math.max(minCaloriesFromProtein, minCaloriesFromCarbs, minCaloriesFromFat, 800);
  
  // Matematisk minimum fra makroer
  const caloriesFromProtein = values.protein * 4;
  const caloriesFromCarbs = values.carbs * 4;
  const caloriesFromFat = values.fat * 9;
  const totalMacroCalories = caloriesFromProtein + caloriesFromCarbs + caloriesFromFat;

  // Valideringsstatus
  const hasProteinCalorieConflict = values.protein > 0 && values.calories < minCaloriesFromProtein;
  const hasCarbsCalorieConflict = values.carbs > 0 && values.calories < minCaloriesFromCarbs;
  const hasFatCalorieConflict = values.fat > 0 && values.calories < minCaloriesFromFat;
  const hasMacroOverflow = totalMacroCalories > values.calories;
  const isCaloriesTooLow = values.calories < practicalMinCalories;
  const needsProteinPowder = values.protein >= 100 && values.calories < 800;

  // NYE VALIDERINGS-CHECKS for ekstreme værdier
  const weightKg = profileData?.weightKg || 70;
  const proteinPerKg = values.protein / weightKg;
  const recommendedProtein = Math.round(weightKg * 2.0); // Max anbefalet for muskelvækst
  const hasExcessiveProtein = proteinPerKg > 2.2; // Over 2.2g/kg er for meget
  const proteinExcessPercent = hasExcessiveProtein ? Math.round((values.protein - recommendedProtein) / recommendedProtein * 100) : 0;

  const fatPercent = values.calories > 0 ? (caloriesFromFat / values.calories) * 100 : 0;
  const fatPerKg = values.fat / weightKg;
  const minFatPerKg = 0.7; // Minimum 0.7g fedt per kg for hormon-produktion
  const minFatPercent = 20; // Minimum 20% af kalorier
  const hasDangerouslyLowFat = fatPercent < minFatPercent || fatPerKg < minFatPerKg;
  const recommendedFat = Math.max(
    Math.round(values.calories * 0.25 / 9), // 25% af kalorier
    Math.round(weightKg * 0.8) // 0.8g per kg
  );

  const isValid = !hasProteinCalorieConflict && !hasCarbsCalorieConflict && !hasFatCalorieConflict && values.calories >= 800;

  // Calculate BMR and TDEE for display using Mifflin-St Jeor
  const calculateDetails = () => {
    if (!profileData?.weightKg || !profileData?.heightCm || !profileData?.age) {
      return null;
    }

    const { weightKg, heightCm, age, gender, activityLevel } = profileData;

    // Mifflin-St Jeor BMR formula (mest præcis for moderne befolkninger)
    const bmr = gender === 'male'
      ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
      : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);

    const activity = activityMultipliers[activityLevel || 'moderate'];
    const tdee = Math.round(bmr * activity.multiplier);

    let adjustedCalories = tdee;
    let adjustment = 0;
    if (dietaryGoal === 'lose') {
      adjustment = -500;
      adjustedCalories = tdee - 500;
    } else if (dietaryGoal === 'gain') {
      adjustment = 500;
      adjustedCalories = tdee + 500;
    }

    // Real-life fradrag
    const realLifeCaloriesPerDay = Math.round((realLifeData?.caloriesPerWeek || 0) / 7);
    const realLifeProteinPerDay = Math.round((realLifeData?.proteinPerWeek || 0) / 7);
    const finalCalories = adjustedCalories - realLifeCaloriesPerDay;

    return {
      bmr,
      tdee,
      adjustedCalories,
      finalCalories,
      adjustment,
      realLifeCaloriesPerDay,
      realLifeProteinPerDay,
      activityName: activity.name,
      activityMultiplier: activity.multiplier,
      weightKg,
      heightCm,
      age,
      gender,
    };
  };

  const details = calculateDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('profile.editMacros.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t('profile.editMacros.description')}
          </p>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="calories">{t('profile.calories')}</Label>
              <Input
                id="calories"
                type="number"
                value={values.calories}
                onChange={(e) => handleChange('calories', e.target.value)}
                min={800}
                className={isCaloriesTooLow ? 'border-destructive' : ''}
              />
              {values.calories < 800 && values.calories > 0 && (
                <p className="text-xs text-destructive">Minimum 800 kcal</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="protein">{t('profile.protein')} (g)</Label>
              <Input
                id="protein"
                type="number"
                value={values.protein}
                onChange={(e) => handleChange('protein', e.target.value)}
                min={0}
                className={hasProteinCalorieConflict ? 'border-destructive' : ''}
              />
              {values.protein > 0 && (
                <p className={`text-xs ${hasProteinCalorieConflict ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Kræver min. {minCaloriesFromProtein} kcal for realistiske retter
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="carbs">{t('profile.carbs')} (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={values.carbs}
                onChange={(e) => handleChange('carbs', e.target.value)}
                min={0}
                className={hasCarbsCalorieConflict ? 'border-destructive' : ''}
              />
              {values.carbs > 0 && (
                <p className={`text-xs ${hasCarbsCalorieConflict ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Kræver min. {minCaloriesFromCarbs} kcal for realistiske retter
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fat">{t('profile.fat')} (g)</Label>
              <Input
                id="fat"
                type="number"
                value={values.fat}
                onChange={(e) => handleChange('fat', e.target.value)}
                min={0}
                className={hasFatCalorieConflict ? 'border-destructive' : ''}
              />
              {values.fat > 0 && (
                <p className={`text-xs ${hasFatCalorieConflict ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Kræver min. {minCaloriesFromFat} kcal for realistiske retter
                </p>
              )}
            </div>
          </div>

          {/* Kalorieregnskab */}
          <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="font-medium text-foreground mb-2">Kalorieregnskab:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Protein: {values.protein}g × 4 =</span>
              <span className="text-right">{caloriesFromProtein} kcal</span>
              <span>Kulhydrater: {values.carbs}g × 4 =</span>
              <span className="text-right">{caloriesFromCarbs} kcal</span>
              <span>Fedt: {values.fat}g × 9 =</span>
              <span className="text-right">{caloriesFromFat} kcal</span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2 flex justify-between items-center">
              <span className="font-medium">Total fra makroer:</span>
              <span className={`font-bold ${hasMacroOverflow ? 'text-destructive' : 'text-foreground'}`}>
                {totalMacroCalories} / {values.calories} kcal
                {hasMacroOverflow && ' ⚠️'}
              </span>
            </div>
            {!hasMacroOverflow && !isCaloriesTooLow && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 pt-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Kombination OK</span>
              </div>
            )}
          </div>

          {/* Advarsler */}
          {hasProteinCalorieConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Umulig kombination!</strong>
                <br />
                {values.protein}g protein kræver minimum {minCaloriesFromProtein} kcal for at lave realistiske retter.
                Du har kun sat {values.calories} kcal.
              </AlertDescription>
            </Alert>
          )}

          {hasCarbsCalorieConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Umulig kombination!</strong>
                <br />
                {values.carbs}g kulhydrater kræver minimum {minCaloriesFromCarbs} kcal for at lave realistiske retter.
                Du har kun sat {values.calories} kcal.
              </AlertDescription>
            </Alert>
          )}

          {hasFatCalorieConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Umulig kombination!</strong>
                <br />
                {values.fat}g fedt kræver minimum {minCaloriesFromFat} kcal for at lave realistiske retter.
                Du har kun sat {values.calories} kcal.
              </AlertDescription>
            </Alert>
          )}

          {hasMacroOverflow && !hasProteinCalorieConflict && !hasCarbsCalorieConflict && !hasFatCalorieConflict && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Makroer overstiger kalorier!</strong>
                <br />
                Dine makroer giver {totalMacroCalories} kcal, men du har sat {values.calories} kcal.
                Juster enten kalorier op eller makroer ned.
              </AlertDescription>
            </Alert>
          )}

          {needsProteinPowder && !hasProteinCalorieConflict && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip: Overvej proteinpulver</strong>
                <br />
                Med {values.protein}g protein og kun {values.calories} kcal, kan proteinpulver
                hjælpe (~25g protein per 100 kcal).
              </AlertDescription>
            </Alert>
          )}

          {hasExcessiveProtein && (
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Protein for højt!</strong>
                <br />
                {values.protein}g protein = {proteinPerKg.toFixed(1)}g/kg kropsvægt ({proteinExcessPercent}% over anbefalet).
                <br />
                <span className="text-sm">
                  Anbefalet for muskelvækst: {recommendedProtein}g/dag (2.0g/kg).
                  Overskydende protein giver ingen ekstra fordele og kan belaste nyrerne.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {hasDangerouslyLowFat && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>Fedt farligt lavt!</strong>
                <br />
                {values.fat}g fedt = {fatPerKg.toFixed(1)}g/kg ({fatPercent.toFixed(0)}% af kalorier).
                <br />
                <span className="text-sm">
                  Minimum anbefalet: {recommendedFat}g/dag.
                  For lavt fedt påvirker hormonproduktion (testosteron) og vitaminoptagelse (A, D, E, K).
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {t('profile.editMacros.resetToCalculated')}
          </Button>

          {/* Show actual calculation with user's values */}
          {details && profileData && (
            <div className="text-xs bg-muted p-3 rounded-lg space-y-2">
              <p className="font-medium text-foreground">Din personlige beregning:</p>
              <p className="text-muted-foreground italic text-[10px]">
                Model: Mifflin-St Jeor (mest præcis for moderne befolkninger)
              </p>
              <div className="space-y-1 font-mono text-muted-foreground">
                <p className="text-[11px]">
                  BMR: (10 × {details.weightKg}kg) + (6.25 × {details.heightCm}cm) - (5 × {details.age}) {details.gender === 'male' ? '+ 5' : '- 161'}
                </p>
                <p className="ml-4">
                  = <span className="text-foreground font-semibold">{details.bmr}</span> kcal
                </p>
                <p className="text-[11px] mt-2">
                  TDEE: {details.bmr} × {details.activityMultiplier} ({details.activityName})
                </p>
                <p className="ml-4">
                  = <span className="text-foreground font-semibold">{details.tdee}</span> kcal
                </p>
                {dietaryGoal === 'lose' && (
                  <p className="mt-2">
                    {details.tdee} − 500 kcal (vægttab) = {details.adjustedCalories} kcal
                  </p>
                )}
                {dietaryGoal === 'gain' && (
                  <p className="mt-2">
                    {details.tdee} + 500 kcal (vægtøgning) = {details.adjustedCalories} kcal
                  </p>
                )}
                {(!dietaryGoal || dietaryGoal === 'maintain') && (
                  <p className="mt-2">
                    = {details.adjustedCalories} kcal
                  </p>
                )}
                {details.realLifeCaloriesPerDay > 0 && (
                  <p className="mt-1 text-orange-600 dark:text-orange-400">
                    − {details.realLifeCaloriesPerDay} kcal (real-life fradrag)
                  </p>
                )}
                <p className="mt-1 pt-1 border-t border-border/50">
                  = <span className="text-primary font-bold">{details.finalCalories} kcal/dag</span> (mål for madplan)
                </p>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="font-medium text-foreground">Makro-fordeling ({goalNames[dietaryGoal || 'maintain']}):</p>
                <p className="text-muted-foreground">
                  {dietaryGoal === 'lose' ? 'Protein 30% · Kulhydrater 40% · Fedt 30%' :
                   dietaryGoal === 'gain' ? 'Protein 30% · Kulhydrater 45% · Fedt 25%' :
                   'Protein 25% · Kulhydrater 45% · Fedt 30%'}
                </p>
              </div>
            </div>
          )}

          {/* Fallback if no profile data */}
          {!details && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg space-y-2">
              <p className="font-medium">{t('profile.editMacros.howCalculated')}</p>
              <p>{t('profile.editMacros.formula')}</p>
              <p className="font-medium pt-1">{t('profile.editMacros.currentDistribution')}</p>
              <p>
                {dietaryGoal === 'lose' && t('profile.editMacros.formulaLose')}
                {dietaryGoal === 'gain' && t('profile.editMacros.formulaGain')}
                {(!dietaryGoal || dietaryGoal === 'maintain') && t('profile.editMacros.formulaMaintain')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
