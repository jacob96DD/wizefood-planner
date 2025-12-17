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

  const fetchBasislager = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First check if user has basislager items
      const { data: inventoryItems, error } = await supabase
        .from('household_inventory')
        .select('id, ingredient_name, is_depleted')
        .eq('user_id', user.id)
        .eq('category', 'basislager')
        .order('ingredient_name', { ascending: true });

      if (error) throw error;

      // Get pantry staples for icons and categories
      const { data: staples } = await supabase
        .from('pantry_staples')
        .select('name, icon, category');

      const stapleMap = new Map(
        staples?.map(s => [s.name.toLowerCase(), { icon: s.icon, category: s.category }]) || []
      );

      // If no basislager items exist, initialize them
      if (!inventoryItems || inventoryItems.length === 0) {
        if (staples && staples.length > 0) {
          const newItems = staples.map(staple => ({
            user_id: user.id,
            ingredient_name: staple.name,
            category: 'basislager',
            is_depleted: false,
          }));
          
          await supabase.from('household_inventory').insert(newItems);
          
          // Re-fetch after insert
          const { data: newInventory } = await supabase
            .from('household_inventory')
            .select('id, ingredient_name, is_depleted')
            .eq('user_id', user.id)
            .eq('category', 'basislager')
            .order('ingredient_name', { ascending: true });
          
          setItems((newInventory || []).map(item => {
            const info = stapleMap.get(item.ingredient_name.toLowerCase());
            return {
              ...item,
              category: info?.category || 'andet',
              icon: info?.icon || undefined,
            };
          }));
        }
      } else {
        setItems(inventoryItems.map(item => {
          const info = stapleMap.get(item.ingredient_name.toLowerCase());
          return {
            ...item,
            category: info?.category || 'andet',
            icon: info?.icon || undefined,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching basislager:', error);
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
    toggleStock,
    getItemsByCategory,
    categoryLabels: CATEGORY_LABELS,
    missingCount,
    totalCount,
    refetch: fetchBasislager,
  };
}
