import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Camera, ListPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventory } from '@/hooks/useInventory';
import { useFridgeScanner } from '@/hooks/useFridgeScanner';
import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';
import { toast } from 'sonner';

interface AddInventoryItemDialogProps {
  trigger?: React.ReactNode;
  defaultCategory?: 'fridge' | 'pantry';
  onSuccess?: () => void;
}

const quickExpiryOptions = [
  { label: '+1 dag', days: 1 },
  { label: '+3 dage', days: 3 },
  { label: '+1 uge', days: 7 },
  { label: '+1 md', days: 30 },
  { label: '+1 år', days: 365 },
];

export function AddInventoryItemDialog({
  trigger,
  defaultCategory = 'fridge',
  onSuccess,
}: AddInventoryItemDialogProps) {
  const { t } = useTranslation();
  const { addItem, addMultipleItems, saving, refetch } = useInventory();
  const { scanFridgePhoto, scanning } = useFridgeScanner();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'photo'>('manual');
  
  // Manual entry state
  const [manualItems, setManualItems] = useState('');
  const [category, setCategory] = useState<'fridge' | 'pantry'>(defaultCategory);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  
  // AI entry state
  const [aiText, setAiText] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  
  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const getExpiryDate = (): string | undefined => {
    if (expiryDays === null) return undefined;
    const date = addDays(new Date(), expiryDays);
    return date.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setManualItems('');
    setAiText('');
    setExpiryDays(null);
    setCategory(defaultCategory);
  };

  // Handle manual list submission (comma-separated items like "æg, kartofler, mælk")
  const handleManualSubmit = async () => {
    if (!manualItems.trim()) return;
    
    const itemNames = manualItems.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (itemNames.length === 0) return;

    const expiryDate = getExpiryDate();
    const itemsToAdd = itemNames.map(name => ({
      ingredient_name: name,
      category,
      expires_at: expiryDate,
    }));

    const success = await addMultipleItems(itemsToAdd);
    if (success) {
      toast.success(t('inventory.itemsAdded', { count: itemNames.length }));
      resetForm();
      setOpen(false);
      onSuccess?.();
    }
  };

  // Handle AI text processing
  const handleAiSubmit = async () => {
    if (!aiText.trim()) return;
    
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-inventory-text', {
        body: { text: aiText, category }
      });

      if (error) throw error;

      const items = data?.items || [];
      if (items.length === 0) {
        toast.error(t('inventory.noItemsFound'));
        return;
      }

      const success = await addMultipleItems(items);
      if (success) {
        toast.success(t('inventory.itemsAdded', { count: items.length }));
        resetForm();
        setOpen(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('AI parsing error:', error);
      toast.error(t('common.error'));
    } finally {
      setAiProcessing(false);
    }
  };

  // Handle photo capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ingredients = await scanFridgePhoto(base64, category);
        
        if (ingredients.length > 0) {
          const itemsToAdd = ingredients.map(ing => ({
            ingredient_name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category || category,
            expires_at: ing.expires_at,
          }));

          const success = await addMultipleItems(itemsToAdd);
          if (success) {
            toast.success(t('inventory.itemsAdded', { count: ingredients.length }));
            resetForm();
            setOpen(false);
            onSuccess?.();
          }
        } else {
          toast.info(t('inventory.noItemsFound'));
        }
        setPhotoProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Photo scan error:', error);
      toast.error(t('common.error'));
      setPhotoProcessing(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing = saving || aiProcessing || photoProcessing || scanning;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('inventory.add')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inventory.addItem')}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
              <ListPlus className="w-4 h-4" />
              {t('inventory.addMethods.manual')}
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4" />
              {t('inventory.addMethods.ai')}
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-1.5 text-xs">
              <Camera className="w-4 h-4" />
              {t('inventory.addMethods.photo')}
            </TabsTrigger>
          </TabsList>

          {/* Category selector - shared across all tabs */}
          <div className="mt-4 mb-3">
            <Label className="text-xs text-muted-foreground mb-2 block">{t('inventory.category')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={category === 'fridge' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('fridge')}
                className="flex items-center gap-2"
              >
                🧊 {t('inventory.tabs.fridge')}
              </Button>
              <Button
                type="button"
                variant={category === 'pantry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('pantry')}
                className="flex items-center gap-2"
              >
                🗄️ {t('inventory.tabs.pantry')}
              </Button>
            </div>
          </div>

          {/* Manual entry tab */}
          <TabsContent value="manual" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label>{t('inventory.addMethods.manualHint')}</Label>
              <Textarea
                value={manualItems}
                onChange={(e) => setManualItems(e.target.value)}
                placeholder="æg, mælk, smør, ost..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Quick expiry buttons */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('inventory.expiresAt')}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {quickExpiryOptions.map((opt) => (
                  <Button
                    key={opt.days}
                    type="button"
                    variant={expiryDays === opt.days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiryDays(expiryDays === opt.days ? null : opt.days)}
                    className="text-xs px-2 h-7"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleManualSubmit}
              disabled={isProcessing || !manualItems.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('inventory.addItems')}
            </Button>
          </TabsContent>

          {/* AI text entry tab */}
          <TabsContent value="ai" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label>{t('inventory.addMethods.aiHint')}</Label>
              <Textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={t('inventory.addMethods.aiPlaceholder')}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleAiSubmit}
              disabled={isProcessing || !aiText.trim()}
            >
              {aiProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {t('inventory.parseWithAi')}
            </Button>
          </TabsContent>

          {/* Photo capture tab */}
          <TabsContent value="photo" className="space-y-4 mt-0">
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('inventory.addMethods.photoHint')}
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full"
              >
                {photoProcessing || scanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                {t('inventory.takePhoto')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
