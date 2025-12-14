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

interface EditMacrosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: MacroValues;
  calculatedValues: MacroValues;
  onSave: (values: MacroValues) => void;
}

export function EditMacrosDialog({
  open,
  onOpenChange,
  currentValues,
  calculatedValues,
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

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">{t('profile.editMacros.howCalculated')}</p>
            <p>{t('profile.editMacros.formula')}</p>
          </div>
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
