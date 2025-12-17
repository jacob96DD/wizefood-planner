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
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Pizza, Beer, Wine, Utensils, Pencil, Check, X } from 'lucide-react';
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
  items: RealLifeItem[];
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<RealLifeItem | null>(null);
  const [estimate, setEstimate] = useState<RealLifeEstimate | null>(
    currentCaloriesPerWeek
      ? {
          calories_per_week: currentCaloriesPerWeek,
          calories_per_day: Math.round(currentCaloriesPerWeek / 7),
          protein: currentProtein || 0,
          carbs: currentCarbs || 0,
          fat: currentFat || 0,
          items: [],
        }
      : null
  );

  useEffect(() => {
    if (open) {
      setDescription(currentDescription || '');
      setEditingIndex(null);
      setEditValues(null);
      if (currentCaloriesPerWeek) {
        setEstimate({
          calories_per_week: currentCaloriesPerWeek,
          calories_per_day: Math.round(currentCaloriesPerWeek / 7),
          protein: currentProtein || 0,
          carbs: currentCarbs || 0,
          fat: currentFat || 0,
          items: [],
        });
      } else {
        setEstimate(null);
      }
    }
  }, [open, currentDescription, currentCaloriesPerWeek, currentProtein, currentCarbs, currentFat]);

  const recalculateTotals = (items: RealLifeItem[]): RealLifeEstimate => {
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return {
      calories_per_week: totals.calories,
      calories_per_day: Math.round(totals.calories / 7),
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      items,
    };
  };

  const handleEditItem = (index: number) => {
    if (estimate?.items[index]) {
      setEditingIndex(index);
      setEditValues({ ...estimate.items[index] });
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editValues || !estimate) return;
    const newItems = [...estimate.items];
    newItems[editingIndex] = editValues;
    setEstimate(recalculateTotals(newItems));
    setEditingIndex(null);
    setEditValues(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValues(null);
  };

  const handleDeleteItem = (index: number) => {
    if (!estimate) return;
    const newItems = estimate.items.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      setEstimate(null);
    } else {
      setEstimate(recalculateTotals(newItems));
    }
  };

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
                    <p className="text-xs font-medium text-muted-foreground">Fordeling (klik for at redigere):</p>
                    {estimate.items.map((item, i) => (
                      <div key={i} className="bg-background rounded-lg px-3 py-2">
                        {editingIndex === i && editValues ? (
                          // Edit mode
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm flex-1">{item.name}</span>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                <X className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs">Kcal</Label>
                                <Input
                                  type="number"
                                  value={editValues.calories}
                                  onChange={(e) => setEditValues({ ...editValues, calories: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Protein</Label>
                                <Input
                                  type="number"
                                  value={editValues.protein}
                                  onChange={(e) => setEditValues({ ...editValues, protein: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Kulh.</Label>
                                <Input
                                  type="number"
                                  value={editValues.carbs}
                                  onChange={(e) => setEditValues({ ...editValues, carbs: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Fedt</Label>
                                <Input
                                  type="number"
                                  value={editValues.fat}
                                  onChange={(e) => setEditValues({ ...editValues, fat: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div 
                            className="cursor-pointer hover:bg-muted/50 rounded -m-2 p-2 transition-colors"
                            onClick={() => handleEditItem(i)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-muted-foreground text-xs ml-2">({item.amount})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary text-sm">{item.calories} kcal</span>
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{item.protein}g protein</span>
                              <span>{item.carbs}g kulh.</span>
                              <span>{item.fat}g fedt</span>
                            </div>
                          </div>
                        )}
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
