import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100),
  gender: z.string().min(1, 'Gender is required'),
  heightCm: z.number().min(50).max(300).nullable(),
  weightKg: z.number().min(20).max(500).nullable(),
  activityLevel: z.string().min(1, 'Activity level is required'),
  dietaryGoal: z.string().min(1, 'Goal is required'),
});

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { t } = useTranslation();
  const { user, setProfile } = useAuthStore();
  const { data, updateData } = useOnboardingStore();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    gender: data.gender || '',
    heightCm: data.heightCm?.toString() || '',
    weightKg: data.weightKg?.toString() || '',
    activityLevel: data.activityLevel || '',
    dietaryGoal: data.dietaryGoal || '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        fullName: data.fullName || '',
        gender: data.gender || '',
        heightCm: data.heightCm?.toString() || '',
        weightKg: data.weightKg?.toString() || '',
        activityLevel: data.activityLevel || '',
        dietaryGoal: data.dietaryGoal || '',
      });
    }
  }, [open, data]);

  const handleSave = async () => {
    if (!user) return;

    const parsed = profileSchema.safeParse({
      fullName: formData.fullName,
      gender: formData.gender,
      heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
      weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
      activityLevel: formData.activityLevel,
      dietaryGoal: formData.dietaryGoal,
    });

    if (!parsed.success) {
      toast.error(t('common.error'), {
        description: parsed.error.errors[0]?.message,
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          full_name: parsed.data.fullName,
          gender: parsed.data.gender,
          height_cm: parsed.data.heightCm,
          weight_kg: parsed.data.weightKg,
          activity_level: parsed.data.activityLevel,
          dietary_goal: parsed.data.dietaryGoal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local stores
      updateData({
        fullName: parsed.data.fullName,
        gender: parsed.data.gender,
        heightCm: parsed.data.heightCm,
        weightKg: parsed.data.weightKg,
        activityLevel: parsed.data.activityLevel,
        dietaryGoal: parsed.data.dietaryGoal,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      toast.success(t('profile.profileSaved'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
  const goals = ['lose', 'maintain', 'gain'];
  const genders = ['male', 'female', 'other'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('profile.editProfile')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('onboarding.yourName')}</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder={t('onboarding.enterName')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('onboarding.gender')}</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('onboarding.gender')} />
              </SelectTrigger>
              <SelectContent>
                {genders.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`onboarding.genders.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">{t('onboarding.height')}</Label>
              <Input
                id="height"
                type="number"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                placeholder={t('onboarding.heightPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">{t('onboarding.weight')}</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                placeholder={t('onboarding.weightPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('onboarding.activityLevel.title')}</Label>
            <Select
              value={formData.activityLevel}
              onValueChange={(value) => setFormData({ ...formData, activityLevel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('onboarding.activityLevel.title')} />
              </SelectTrigger>
              <SelectContent>
                {activityLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {t(`onboarding.activities.${level}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('profile.goal')}</Label>
            <Select
              value={formData.dietaryGoal}
              onValueChange={(value) => setFormData({ ...formData, dietaryGoal: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('profile.goal')} />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal} value={goal}>
                    {t(`profile.goals.${goal}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
