import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const progressSchema = z.object({
  weight_kg: z.number().min(20).max(500).nullable(),
  body_fat_percentage: z.number().min(1).max(60).nullable(),
  muscle_mass_kg: z.number().min(10).max(200).nullable(),
  waist_cm: z.number().min(30).max(200).nullable(),
  notes: z.string().max(500).nullable(),
});

interface AddProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddProgressDialog({ open, onOpenChange, onSuccess }: AddProgressDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    weightKg: '',
    bodyFatPercentage: '',
    muscleMassKg: '',
    waistCm: '',
    notes: '',
  });

  const handleSave = async () => {
    if (!user) return;

    const parsed = progressSchema.safeParse({
      weight_kg: formData.weightKg ? parseFloat(formData.weightKg) : null,
      body_fat_percentage: formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null,
      muscle_mass_kg: formData.muscleMassKg ? parseFloat(formData.muscleMassKg) : null,
      waist_cm: formData.waistCm ? parseFloat(formData.waistCm) : null,
      notes: formData.notes || null,
    });

    if (!parsed.success) {
      toast.error(t('common.error'), {
        description: parsed.error.errors[0]?.message,
      });
      return;
    }

    // At least one measurement is required
    if (!parsed.data.weight_kg && !parsed.data.body_fat_percentage && 
        !parsed.data.muscle_mass_kg && !parsed.data.waist_cm) {
      toast.error(t('common.error'), {
        description: t('progress.atLeastOneMeasurement'),
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          weight_kg: parsed.data.weight_kg,
          body_fat_percentage: parsed.data.body_fat_percentage,
          muscle_mass_kg: parsed.data.muscle_mass_kg,
          waist_cm: parsed.data.waist_cm,
          notes: parsed.data.notes,
        });

      if (error) throw error;

      toast.success(t('progress.saved'));
      
      // Reset form
      setFormData({
        weightKg: '',
        bodyFatPercentage: '',
        muscleMassKg: '',
        waistCm: '',
        notes: '',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('progress.addMeasurement')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="weight">{t('progress.weight')} (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              placeholder={t('onboarding.weightPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyFat">{t('progress.bodyFat')} (%)</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                value={formData.bodyFatPercentage}
                onChange={(e) => setFormData({ ...formData, bodyFatPercentage: e.target.value })}
                placeholder="e.g. 18"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscleMass">{t('progress.muscleMass')} (kg)</Label>
              <Input
                id="muscleMass"
                type="number"
                step="0.1"
                value={formData.muscleMassKg}
                onChange={(e) => setFormData({ ...formData, muscleMassKg: e.target.value })}
                placeholder="e.g. 35"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waist">{t('progress.waist')} (cm)</Label>
            <Input
              id="waist"
              type="number"
              step="0.1"
              value={formData.waistCm}
              onChange={(e) => setFormData({ ...formData, waistCm: e.target.value })}
              placeholder="e.g. 80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('progress.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('progress.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
