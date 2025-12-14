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
import { Calculator } from 'lucide-react';

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

interface EditMacrosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: MacroValues;
  calculatedValues: MacroValues;
  dietaryGoal?: string;
  profileData?: ProfileData;
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

export function EditMacrosDialog({
  open,
  onOpenChange,
  currentValues,
  calculatedValues,
  dietaryGoal,
  profileData,
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
    setValues(calculatedValues);
  };

  const handleChange = (field: keyof MacroValues, value: string) => {
    const numValue = parseInt(value) || 0;
    setValues(prev => ({ ...prev, [field]: numValue }));
  };

  // Calculate BMR and TDEE for display
  const calculateDetails = () => {
    if (!profileData?.weightKg || !profileData?.heightCm || !profileData?.age) {
      return null;
    }

    const { weightKg, heightCm, age, gender, activityLevel } = profileData;
    
    // Harris-Benedict BMR formula
    const bmr = gender === 'male'
      ? Math.round(88.36 + (13.4 * weightKg) + (4.8 * heightCm) - (5.7 * age))
      : Math.round(447.6 + (9.2 * weightKg) + (3.1 * heightCm) - (4.3 * age));

    const activity = activityMultipliers[activityLevel || 'moderate'];
    const tdee = Math.round(bmr * activity.multiplier);

    let finalCalories = tdee;
    let adjustment = 0;
    if (dietaryGoal === 'lose') {
      adjustment = -500;
      finalCalories = tdee - 500;
    } else if (dietaryGoal === 'gain') {
      adjustment = 500;
      finalCalories = tdee + 500;
    }

    return {
      bmr,
      tdee,
      finalCalories,
      adjustment,
      activityName: activity.name,
      activityMultiplier: activity.multiplier,
    };
  };

  const details = calculateDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                min={0}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="protein">{t('profile.protein')} (g)</Label>
              <Input
                id="protein"
                type="number"
                value={values.protein}
                onChange={(e) => handleChange('protein', e.target.value)}
                min={0}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="carbs">{t('profile.carbs')} (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={values.carbs}
                onChange={(e) => handleChange('carbs', e.target.value)}
                min={0}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fat">{t('profile.fat')} (g)</Label>
              <Input
                id="fat"
                type="number"
                value={values.fat}
                onChange={(e) => handleChange('fat', e.target.value)}
                min={0}
              />
            </div>
          </div>

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
              <div className="space-y-1 font-mono text-muted-foreground">
                <p>
                  BMR: <span className="text-foreground font-semibold">{details.bmr}</span> kcal
                  <span className="text-muted-foreground/70 ml-1">
                    ({profileData.weightKg}kg, {profileData.heightCm}cm, {profileData.age} år)
                  </span>
                </p>
                <p>
                  × {details.activityName} ({details.activityMultiplier}) = <span className="text-foreground font-semibold">{details.tdee}</span> kcal
                </p>
                {dietaryGoal === 'lose' && (
                  <p>
                    − 500 kcal (vægttab) = <span className="text-primary font-bold">{details.finalCalories} kcal/dag</span>
                  </p>
                )}
                {dietaryGoal === 'gain' && (
                  <p>
                    + 500 kcal (vægtøgning) = <span className="text-primary font-bold">{details.finalCalories} kcal/dag</span>
                  </p>
                )}
                {(!dietaryGoal || dietaryGoal === 'maintain') && (
                  <p>
                    = <span className="text-primary font-bold">{details.finalCalories} kcal/dag</span>
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="font-medium text-foreground">Makro-fordeling ({goalNames[dietaryGoal || 'maintain']}):</p>
                <p className="text-muted-foreground">Protein 30% · Kulhydrater 45% · Fedt 25%</p>
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
          <Button onClick={handleSave}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
