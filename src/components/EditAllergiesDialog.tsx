import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
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

interface EditAllergiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const allergensList = [
  { id: 'gluten', icon: '🌾' },
  { id: 'dairy', icon: '🥛' },
  { id: 'eggs', icon: '🥚' },
  { id: 'nuts', icon: '🥜' },
  { id: 'fish', icon: '🐟' },
  { id: 'shellfish', icon: '🦐' },
  { id: 'soy', icon: '🫘' },
  { id: 'celery', icon: '🥬' },
];

const allergenNameMap: Record<string, string> = {
  gluten: 'gluten',
  dairy: 'mælk',
  eggs: 'æg',
  nuts: 'nødder',
  fish: 'fisk',
  shellfish: 'skaldyr',
  soy: 'soja',
  celery: 'selleri',
};

export function EditAllergiesDialog({ open, onOpenChange }: EditAllergiesDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [customAllergens, setCustomAllergens] = useState('');
  const [dbAllergens, setDbAllergens] = useState<{ id: string; name: string }[]>([]);

  // Fetch current allergies
  useEffect(() => {
    if (!open || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch allergen definitions
        const { data: allergenData } = await supabase
          .from('allergens')
          .select('id, name');

        if (allergenData) {
          setDbAllergens(allergenData);
        }

        // Fetch user's allergens
        const { data: userAllergens } = await supabase
          .from('user_allergens')
          .select('allergen_id')
          .eq('user_id', user.id);

        if (userAllergens && allergenData) {
          // Map DB allergen IDs back to UI IDs
          const reverseMap: Record<string, string> = {};
          allergenData.forEach(a => {
            Object.entries(allergenNameMap).forEach(([uiId, dbName]) => {
              if (a.name.toLowerCase() === dbName) {
                reverseMap[a.id] = uiId;
              }
            });
          });

          const selected = userAllergens
            .map(ua => reverseMap[ua.allergen_id])
            .filter(Boolean);
          
          setSelectedAllergens(selected);
        }
      } catch (error) {
        console.error('Error fetching allergies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user]);

  const toggleAllergen = (id: string) => {
    setSelectedAllergens(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Delete existing allergens
      await supabase
        .from('user_allergens')
        .delete()
        .eq('user_id', user.id);

      // Map allergen names to database IDs
      const allergenMap: Record<string, string> = {};
      dbAllergens.forEach(a => {
        allergenMap[a.name.toLowerCase()] = a.id;
      });

      // Insert new allergens
      const userAllergens = selectedAllergens
        .map(allergenId => {
          const allergenName = allergenNameMap[allergenId];
          const dbAllergenId = allergenName ? allergenMap[allergenName] : null;
          
          if (dbAllergenId) {
            return {
              user_id: user.id,
              allergen_id: dbAllergenId,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (userAllergens.length > 0) {
        await supabase.from('user_allergens').insert(userAllergens);
      }

      toast.success(t('profile.allergiesSaved', 'Allergier gemt'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving allergies:', error);
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
            ⚠️ {t('onboarding.allergies.title')}
          </DialogTitle>
          <DialogDescription>
            {t('onboarding.allergies.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {allergensList.map((allergen) => {
                const isSelected = selectedAllergens.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    onClick={() => toggleAllergen(allergen.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{allergen.icon}</span>
                    <span className="font-medium">{t(`onboarding.allergens.${allergen.id}`)}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('onboarding.allergies.customLabel')}
              </label>
              <Input
                placeholder={t('onboarding.allergies.customPlaceholder')}
                value={customAllergens}
                onChange={(e) => setCustomAllergens(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('onboarding.allergies.customHint')}
              </p>
            </div>

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
