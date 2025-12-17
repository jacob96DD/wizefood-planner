import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

export type InventoryCategory = 'fridge' | 'freezer' | 'pantry' | 'basislager';

export interface InventoryItem {
  id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: InventoryCategory;
  expires_at: string | null;
  is_depleted: boolean;
  added_at: string;
}

export function useInventory() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Note: Basislager initialization is now handled by useBasislager hook only

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_inventory')
        .select('*')
        .eq('user_id', user.id)
        .neq('category', 'basislager') // Exclude basislager from regular inventory
        .eq('is_depleted', false)
        .order('category', { ascending: true })
        .order('ingredient_name', { ascending: true });

      if (error) throw error;
      
      setItems((data || []).map(item => ({
        ...item,
        category: (item.category as InventoryCategory) || 'pantry'
      })));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const addItem = async (item: {
    ingredient_name: string;
    quantity?: number;
    unit?: string;
    category?: InventoryCategory;
    expires_at?: string;
  }) => {
    if (!user) return null;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('household_inventory')
        .insert({
          user_id: user.id,
          ingredient_name: item.ingredient_name,
          quantity: item.quantity || null,
          unit: item.unit || null,
          category: item.category || 'pantry',
          expires_at: item.expires_at || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchInventory();
      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Fejl',
        description: 'Kunne ikke tilføje vare til lager',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('household_inventory')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchInventory();
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('household_inventory')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  };

  const markDepleted = async (id: string) => {
    return updateItem(id, { is_depleted: true });
  };

  const addMultipleItems = async (itemsToAdd: {
    ingredient_name: string;
    quantity?: number;
    unit?: string;
    category?: InventoryCategory;
  }[]) => {
    if (!user || itemsToAdd.length === 0) return false;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('household_inventory')
        .insert(
          itemsToAdd.map(item => ({
            user_id: user.id,
            ingredient_name: item.ingredient_name,
            quantity: item.quantity || null,
            unit: item.unit || null,
            category: item.category || 'pantry',
          }))
        );

      if (error) throw error;
      
      await fetchInventory();
      return true;
    } catch (error) {
      console.error('Error adding items:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Check for expiring items (within 3 days)
  const expiringItems = items.filter(item => {
    if (!item.expires_at) return false;
    const expiryDate = new Date(item.expires_at);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  return {
    items,
    loading,
    saving,
    expiringItems,
    addItem,
    updateItem,
    deleteItem,
    markDepleted,
    addMultipleItems,
    refetch: fetchInventory,
  };
}
