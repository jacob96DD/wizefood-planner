import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wand2, Pizza, Beer, Wine, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface RealLifeItem {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RealLifeEstimate {
  calories_per_week: number;
  calories_per_day: number;
  protein: number;
  carbs: number;
  fat: number;
  items?: RealLifeItem[];
}

interface EditRealLifeCaloriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDescription?: string | null;
  currentCaloriesPerWeek?: number | null;
  currentProtein?: number | null;
  currentCarbs?: number | null;
  currentFat?: number | null;
  onSave: (data: {
    description: string;
    calories_per_week: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}

export function EditRealLifeCaloriesDialog({
  open,
  onOpenChange,
  currentDescription,
  currentCaloriesPerWeek,
  currentProtein,
  currentCarbs,
  currentFat,
  onSave,
}: EditRealLifeCaloriesDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [description, setDescription] = useState(currentDescription || '');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [estimate, setEstimate] = useState<RealLifeEstimate | null>(
    currentCaloriesPerWeek
      ? {
          calories_per_week: currentCaloriesPerWeek,
          calories_per_day: Math.round(currentCaloriesPerWeek / 7),
          protein: currentProtein || 0,
          carbs: currentCarbs || 0,
          fat: currentFat || 0,
        }
      : null
  );

  useEffect(() => {
    if (open) {
      setDescription(currentDescription || '');
      if (currentCaloriesPerWeek) {
        setEstimate({
          calories_per_week: currentCaloriesPerWeek,
          calories_per_day: Math.round(currentCaloriesPerWeek / 7),
          protein: currentProtein || 0,
          carbs: currentCarbs || 0,
          fat: currentFat || 0,
        });
      } else {
        setEstimate(null);
      }
    }
  }, [open, currentDescription, currentCaloriesPerWeek, currentProtein, currentCarbs, currentFat]);

  const estimateFromDescription = async () => {
    if (!description.trim()) {
      toast.error('Skriv en beskrivelse først');
      return;
    }

    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-calories', {
        body: { description },
      });

      if (error) throw error;

      setEstimate({
        calories_per_week: data.calories_per_week,
        calories_per_day: data.calories_per_day,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        items: data.items || [],
      });

      toast.success('Estimeret! 🎉');
    } catch (error) {
      console.error('Error estimating calories:', error);
      toast.error('Kunne ikke estimere kalorier');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!estimate) {
      toast.error('Beregn estimat først');
      return;
    }

    setIsSaving(true);
    try {
      // Save to profiles table
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            real_life_description: description,
            real_life_calories_per_week: estimate.calories_per_week,
            real_life_protein_per_week: estimate.protein,
            real_life_carbs_per_week: estimate.carbs,
            real_life_fat_per_week: estimate.fat,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      onSave({
        description,
        calories_per_week: estimate.calories_per_week,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
      });

      toast.success('Gemt permanent!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving real-life calories:', error);
      toast.error('Kunne ikke gemme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setDescription('');
    setEstimate(null);
    
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            real_life_description: null,
            real_life_calories_per_week: null,
            real_life_protein_per_week: null,
            real_life_carbs_per_week: null,
            real_life_fat_per_week: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
          
        onSave({
          description: '',
          calories_per_week: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
        
        toast.success('Ryddet!');
      } catch (error) {
        console.error('Error clearing real-life calories:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pizza className="w-5 h-5" />
            Real-life kalorier
          </DialogTitle>
          <DialogDescription>
            Beskriv det du spiser/drikker UDEN FOR madplanen - så fratrækker vi det automatisk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Eksempler */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDescription(prev => prev + (prev ? ', ' : '') + '8 øl i weekenden')}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 flex items-center gap-1"
            >
              <Beer className="w-3 h-3" /> 8 øl/uge
            </button>
            <button
              onClick={() => setDescription(prev => prev + (prev ? ', ' : '') + '4 glas vin om ugen')}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 flex items-center gap-1"
            >
              <Wine className="w-3 h-3" /> 4 vin/uge
            </button>
            <button
              onClick={() => setDescription(prev => prev + (prev ? ', ' : '') + 'pizza om lørdagen')}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 flex items-center gap-1"
            >
              <Pizza className="w-3 h-3" /> Pizza lørdag
            </button>
            <button
              onClick={() => setDescription(prev => prev + (prev ? ', ' : '') + 'frokostordning på arbejde 5 dage/uge')}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 flex items-center gap-1"
            >
              <Utensils className="w-3 h-3" /> Frokostordning
            </button>
          </div>

          <div className="space-y-2">
            <Label>Beskrivelse (ugentlig eller daglig)</Label>
            <Textarea
              placeholder="f.eks. frokostordning på arbejde 5 dage/uge, pizza om lørdagen, 5 glas vin i weekenden..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (estimate) setEstimate(null);
              }}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Skriv hvad du typisk spiser/drikker hver uge som ikke skal være del af madplanen.
              <br />
              F.eks. frokostordning, pizza om lørdagen, 5 glas vin i weekenden, etc.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={estimateFromDescription}
            disabled={isCalculating || !description.trim()}
            className="w-full"
          >
            {isCalculating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Beregn med AI
          </Button>

          {/* Estimat resultat */}
          {estimate && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-3">✨ Estimeret ugentligt forbrug:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <span className="text-xl font-bold text-primary">{estimate.calories_per_week}</span>
                    <p className="text-xs text-muted-foreground">kcal/uge</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <span className="text-xl font-bold text-primary">{estimate.calories_per_day}</span>
                    <p className="text-xs text-muted-foreground">kcal/dag</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                  <div>
                    <span className="font-semibold">{estimate.protein}g</span>
                    <p className="text-xs text-muted-foreground">protein/uge</p>
                  </div>
                  <div>
                    <span className="font-semibold">{estimate.carbs}g</span>
                    <p className="text-xs text-muted-foreground">kulh./uge</p>
                  </div>
                  <div>
                    <span className="font-semibold">{estimate.fat}g</span>
                    <p className="text-xs text-muted-foreground">fedt/uge</p>
                  </div>
                </div>

                {/* Itemized breakdown */}
                {estimate.items && estimate.items.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-primary/20 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Fordeling:</p>
                    {estimate.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-background rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">({item.amount})</span>
                        </div>
                        <span className="font-bold text-primary text-sm ml-2">{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Dette fratrækkes automatisk når du genererer madplaner.
                </p>
              </CardContent>
            </Card>
          )}

          {(description || estimate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="w-full text-muted-foreground"
            >
              Ryd alt
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button onClick={handleSave} disabled={!estimate || isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Gem permanent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
