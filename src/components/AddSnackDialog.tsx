import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Keyboard, Sparkles, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDailyMealLog } from '@/hooks/useDailyMealLog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddSnackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}

export function AddSnackDialog({ open, onOpenChange, date }: AddSnackDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { updateExtraCalories, addFoodPhoto, log } = useDailyMealLog(date);
  
  // Manual input
  const [manualDescription, setManualDescription] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  
  // AI input
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  
  // Photo input
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResult, setPhotoResult] = useState<{ calories: number; description: string } | null>(null);

  const handleManualSave = async () => {
    const calories = parseInt(manualCalories) || 0;
    const currentExtra = log?.extra_calories || 0;
    const currentDesc = log?.extra_description || '';
    
    const newDesc = currentDesc 
      ? `${currentDesc}, ${manualDescription}` 
      : manualDescription;
    
    await updateExtraCalories(currentExtra + calories, newDesc);
    
    toast({
      title: '✅ Snack tilføjet',
      description: `${manualDescription} - ${calories} kcal`,
    });
    
    resetAndClose();
  };

  const handleAiEstimate = async () => {
    if (!aiDescription.trim()) return;
    
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-calories', {
        body: { description: aiDescription },
      });
      
      if (error) throw error;
      
      setAiResult({
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
      });
    } catch (err) {
      toast({
        title: 'Fejl',
        description: 'Kunne ikke estimere kalorier',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSave = async () => {
    if (!aiResult) return;
    
    const currentExtra = log?.extra_calories || 0;
    const currentDesc = log?.extra_description || '';
    
    const newDesc = currentDesc 
      ? `${currentDesc}, ${aiDescription} (AI: ${aiResult.calories} kcal)` 
      : `${aiDescription} (AI: ${aiResult.calories} kcal)`;
    
    await updateExtraCalories(currentExtra + aiResult.calories, newDesc);
    
    toast({
      title: '✅ Snack tilføjet via AI',
      description: `${aiDescription} - ${aiResult.calories} kcal`,
    });
    
    resetAndClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoAnalyze = async () => {
    if (!photoFile || !photoPreview) return;
    
    setPhotoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-calories', {
        body: { 
          image_base64: photoPreview.split(',')[1],
          description: 'Analysér dette billede af mad',
        },
      });
      
      if (error) throw error;
      
      setPhotoResult({
        calories: data.calories || 0,
        description: data.description || 'Mad',
      });
    } catch (err) {
      toast({
        title: 'Fejl',
        description: 'Kunne ikke analysere billede',
        variant: 'destructive',
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoSave = async () => {
    if (!photoResult || !photoPreview) return;
    
    // Tilføj som food photo
    await addFoodPhoto({
      url: photoPreview,
      description: photoResult.description,
      estimated_calories: photoResult.calories,
      timestamp: new Date().toISOString(),
    });
    
    // Opdater extra calories
    const currentExtra = log?.extra_calories || 0;
    const currentDesc = log?.extra_description || '';
    
    const newDesc = currentDesc 
      ? `${currentDesc}, ${photoResult.description} (foto)` 
      : `${photoResult.description} (foto)`;
    
    await updateExtraCalories(currentExtra + photoResult.calories, newDesc);
    
    toast({
      title: '📷 Billede tilføjet',
      description: `${photoResult.description} - ${photoResult.calories} kcal`,
    });
    
    resetAndClose();
  };

  const resetAndClose = () => {
    setManualDescription('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setAiDescription('');
    setAiResult(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🍫 Tilføj snack eller ekstra mad</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="text-xs">
              <Keyboard className="w-3 h-3 mr-1" />
              Manuel
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </TabsTrigger>
            <TabsTrigger value="photo" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />
              Billede
            </TabsTrigger>
          </TabsList>

          {/* Manual tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div>
              <Label>Beskrivelse</Label>
              <Input
                placeholder="F.eks. Snickers bar"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kalorier</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                />
              </div>
              <div>
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                />
              </div>
              <div>
                <Label>Kulhydrat (g)</Label>
                <Input
                  type="number"
                  placeholder="35"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                />
              </div>
              <div>
                <Label>Fedt (g)</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleManualSave} 
              className="w-full"
              disabled={!manualDescription || !manualCalories}
            >
              Gem snack
            </Button>
          </TabsContent>

          {/* AI tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div>
              <Label>Beskriv hvad du spiste</Label>
              <Textarea
                placeholder="F.eks. En stor portion pasta carbonara fra kantinen, en cola og en chokolade cookie"
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            {!aiResult ? (
              <Button 
                onClick={handleAiEstimate} 
                className="w-full"
                disabled={!aiDescription.trim() || aiLoading}
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyserer...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Estimer kalorier
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">AI estimat:</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="font-bold">{aiResult.calories}</div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                    </div>
                    <div>
                      <div className="font-bold">{aiResult.protein}g</div>
                      <div className="text-xs text-muted-foreground">protein</div>
                    </div>
                    <div>
                      <div className="font-bold">{aiResult.carbs}g</div>
                      <div className="text-xs text-muted-foreground">kulhydrat</div>
                    </div>
                    <div>
                      <div className="font-bold">{aiResult.fat}g</div>
                      <div className="text-xs text-muted-foreground">fedt</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAiResult(null)} className="flex-1">
                    Prøv igen
                  </Button>
                  <Button onClick={handleAiSave} className="flex-1">
                    Gem
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Photo tab */}
          <TabsContent value="photo" className="space-y-4 mt-4">
            {!photoPreview ? (
              <div>
                <Label>Tag et billede af din mad</Label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Klik for at tage billede</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setPhotoResult(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {!photoResult ? (
                  <Button 
                    onClick={handlePhotoAnalyze} 
                    className="w-full"
                    disabled={photoLoading}
                  >
                    {photoLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyserer billede...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analysér med AI
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium mb-1">{photoResult.description}</p>
                      <p className="text-2xl font-bold">{photoResult.calories} kcal</p>
                    </div>
                    <Button onClick={handlePhotoSave} className="w-full">
                      Gem
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
