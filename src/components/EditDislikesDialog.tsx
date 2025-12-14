import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditDislikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dislikeOptions = [
  { id: 'risalamande', icon: '🍚' },
  { id: 'leverpostej', icon: '🍞' },
  { id: 'fisk', icon: '🐟' },
  { id: 'indmad', icon: '🫀' },
  { id: 'svampe', icon: '🍄' },
  { id: 'oliven', icon: '🫒' },
  { id: 'blodpudding', icon: '🩸' },
  { id: 'ost', icon: '🧀' },
  { id: 'skaldyr', icon: '🦐' },
  { id: 'spidskommen', icon: '🌿' },
  { id: 'koriander', icon: '🌿' },
  { id: 'aubergine', icon: '🍆' },
  { id: 'rosenkaal', icon: '🥬' },
  { id: 'ananas', icon: '🍕' },
  { id: 'lever', icon: '🫀' },
];

export function EditDislikesDialog({ open, onOpenChange }: EditDislikesDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDislikes, setSelectedDislikes] = useState<string[]>([]);
  const [customDislikes, setCustomDislikes] = useState('');

  // Fetch current dislikes
  useEffect(() => {
    if (!open || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('user_food_dislikes')
          .select('food_name')
          .eq('user_id', user.id);

        if (data) {
          const predefinedIds = dislikeOptions.map(d => d.id);
          const selected = data
            .map(d => d.food_name)
            .filter(name => predefinedIds.includes(name));
          
          const custom = data
            .map(d => d.food_name)
            .filter(name => !predefinedIds.includes(name));
          
          setSelectedDislikes(selected);
          setCustomDislikes(custom.join(', '));
        }
      } catch (error) {
        console.error('Error fetching dislikes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user]);

  const toggleDislike = (id: string) => {
    setSelectedDislikes(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Delete existing dislikes
      await supabase
        .from('user_food_dislikes')
        .delete()
        .eq('user_id', user.id);

      // Get all dislikes to save
      const allDislikes = [...selectedDislikes];
      if (customDislikes) {
        const customItems = customDislikes.split(',').map(s => s.trim()).filter(Boolean);
        allDislikes.push(...customItems);
      }

      if (allDislikes.length > 0) {
        const dislikesToInsert = allDislikes.map(food => ({
          user_id: user.id,
          food_name: food,
        }));

        await supabase.from('user_food_dislikes').insert(dislikesToInsert);
      }

      toast.success(t('profile.dislikesSaved', 'Præferencer gemt'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving dislikes:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🙅 {t('onboarding.dislikes.title')}
          </DialogTitle>
          <DialogDescription>
            {t('onboarding.dislikes.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {dislikeOptions.map((food) => {
                const isSelected = selectedDislikes.includes(food.id);
                return (
                  <button
                    key={food.id}
                    onClick={() => toggleDislike(food.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-destructive bg-destructive/10"
                        : "border-border hover:border-destructive/50"
                    )}
                  >
                    <span className="text-xl">{food.icon}</span>
                    <span className="font-medium text-sm">{t(`onboarding.dislikes.${food.id}`)}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-destructive" />}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('onboarding.dislikes.customLabel')}
              </label>
              <Input
                placeholder={t('onboarding.dislikes.customPlaceholder')}
                value={customDislikes}
                onChange={(e) => setCustomDislikes(e.target.value)}
              />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t('onboarding.dislikes.skipNote')}
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
