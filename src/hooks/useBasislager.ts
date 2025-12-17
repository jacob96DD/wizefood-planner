import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface BasislagerItem {
  id: string;
  ingredient_name: string;
  is_depleted: boolean;
  category: string;
  icon?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  krydderier: 'Krydderier',
  olie_fedt: 'Olie & Fedt',
  bagning: 'Bagning & Grundvarer',
  konserves: 'Konserves & Sauce',
  andet: 'Andet',
};

export function useBasislager() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<BasislagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBasislager = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    console.log('🔍 Checking basislager for user:', user.id);
    
    try {
      // First check if user has basislager items
      const { data: inventoryItems, error: fetchError } = await supabase
        .from('household_inventory')
        .select('id, ingredient_name, is_depleted')
        .eq('user_id', user.id)
        .eq('category', 'basislager')
        .order('ingredient_name', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching basislager inventory:', fetchError);
        throw fetchError;
      }
      
      console.log('📦 Found basislager items:', inventoryItems?.length || 0);

      // Get pantry staples for icons and categories
      const { data: staples, error: staplesError } = await supabase
        .from('pantry_staples')
        .select('name, icon, category');

      if (staplesError) {
        console.error('❌ Error fetching pantry_staples:', staplesError);
        throw staplesError;
      }
      
      console.log('🌱 Pantry staples available:', staples?.length || 0);

      const stapleMap = new Map(
        staples?.map(s => [s.name.toLowerCase(), { icon: s.icon, category: s.category }]) || []
      );

      // If no basislager items exist, initialize them
      if (!inventoryItems || inventoryItems.length === 0) {
        if (staples && staples.length > 0) {
          console.log('⚡ Initializing basislager with', staples.length, 'items...');
          
          const newItems = staples.map(staple => ({
            user_id: user.id,
            ingredient_name: staple.name,
            category: 'basislager',
            is_depleted: false,
          }));
          
          const { error: insertError, data: insertedData } = await supabase
            .from('household_inventory')
            .insert(newItems)
            .select('id, ingredient_name, is_depleted');
          
          if (insertError) {
            console.error('❌ Failed to initialize basislager:', insertError);
            setError('Kunne ikke oprette basislager: ' + insertError.message);
            setItems([]);
            return;
          }
          
          console.log('✅ Inserted basislager:', insertedData?.length || 0, 'items');
          
          // Use inserted data directly
          setItems((insertedData || []).map(item => {
            const info = stapleMap.get(item.ingredient_name.toLowerCase());
            return {
              ...item,
              category: info?.category || 'andet',
              icon: info?.icon || undefined,
            };
          }));
        } else {
          console.log('⚠️ No pantry staples found to initialize');
          setItems([]);
        }
      } else {
        // Map existing items with icons/categories
        setItems(inventoryItems.map(item => {
          const info = stapleMap.get(item.ingredient_name.toLowerCase());
          return {
            ...item,
            category: info?.category || 'andet',
            icon: info?.icon || undefined,
          };
        }));
      }
    } catch (err) {
      console.error('❌ Error in fetchBasislager:', err);
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBasislager();
  }, [fetchBasislager]);

  // Toggle stock status (is_depleted)
  const toggleStock = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !user) return false;

    setSaving(true);
    try {
      const newStatus = !item.is_depleted;
      const { error } = await supabase
        .from('household_inventory')
        .update({ is_depleted: newStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === id ? { ...i, is_depleted: newStatus } : i
      ));
      return true;
    } catch (error) {
      console.error('Error toggling stock:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Get items grouped by category
  const getItemsByCategory = () => {
    const grouped: Record<string, BasislagerItem[]> = {};
    
    for (const item of items) {
      const category = item.category || 'andet';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    }
    
    return grouped;
  };

  // Get count of missing items
  const missingCount = items.filter(i => i.is_depleted).length;
  const totalCount = items.length;

  return {
    items,
    loading,
    saving,
    error,
    toggleStock,
    getItemsByCategory,
    categoryLabels: CATEGORY_LABELS,
    missingCount,
    totalCount,
    refetch: fetchBasislager,
  };
}
