import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DetectedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  category: 'fridge' | 'freezer' | 'pantry';
  confidence: 'high' | 'medium' | 'low';
  expires_at?: string;
}

export function useFridgeScanner() {
  const [scanning, setScanning] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([]);
  const { toast } = useToast();

  const scanFridgePhoto = async (imageBase64: string, scanType: 'fridge' | 'pantry' = 'fridge'): Promise<DetectedIngredient[]> => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-fridge-photo', {
        body: { image: imageBase64, scanType },
      });

      if (error) {
        console.error('Fridge scan error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const ingredients: DetectedIngredient[] = (data?.ingredients || []).map((ing: DetectedIngredient) => ({
        ...ing,
        // Override category based on scan type
        category: scanType === 'pantry' ? 'pantry' : ing.category
      }));
      
      setDetectedIngredients(prev => [...prev, ...ingredients]);

      toast({
        title: `Fundet ${ingredients.length} ingredienser!`,
        description: 'Gennemgå listen og bekræft hvad du har.',
      });

      return ingredients;

    } catch (error) {
      console.error('Error scanning fridge:', error);
      toast({
        title: 'Fejl ved scanning',
        description: error instanceof Error ? error.message : 'Kunne ikke analysere billedet.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setScanning(false);
    }
  };

  const addToInventory = async (ingredients: DetectedIngredient[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const items = ingredients.map(ing => {
        // Parse expires_at from DD-MM-YYYY to YYYY-MM-DD
        let expiresAt = null;
        if (ing.expires_at) {
          const parts = ing.expires_at.split('-');
          if (parts.length === 3) {
            expiresAt = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        
        return {
          user_id: user.id,
          ingredient_name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          category: ing.category,
          expires_at: expiresAt,
        };
      });

      const { error } = await supabase
        .from('household_inventory')
        .insert(items);

      if (error) throw error;

      toast({
        title: 'Tilføjet til lager!',
        description: `${ingredients.length} ingredienser er nu i dit lager.`,
      });

      setDetectedIngredients([]);
      return true;

    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast({
        title: 'Fejl',
        description: 'Kunne ikke tilføje til lager.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const clearDetected = () => setDetectedIngredients([]);

  return {
    scanning,
    detectedIngredients,
    scanFridgePhoto,
    addToInventory,
    clearDetected,
  };
}
