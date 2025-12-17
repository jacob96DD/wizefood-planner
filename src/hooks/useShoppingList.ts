import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Json } from '@/integrations/supabase/types';

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  checked: boolean;
  price?: number;
  offerPrice?: number;
  store?: string;
  offerId?: string;
  isEstimate?: boolean; // true = estimeret pris, false/undefined = tilbudspris
}

export interface ShoppingList {
  id: string;
  items: ShoppingListItem[];
  total_price: number | null;
  completed: boolean;
  created_at: string;
  meal_plan_id: string | null;
}

export function useShoppingList() {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchShoppingList();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchShoppingList = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setShoppingList({
          id: data.id,
          items: (data.items as unknown as ShoppingListItem[]) || [],
          total_price: data.total_price,
          completed: data.completed || false,
          created_at: data.created_at || '',
          meal_plan_id: data.meal_plan_id,
        });
      } else {
        setShoppingList(null);
      }
    } catch (err) {
      console.error('Fejl ved hentning af indkøbsseddel:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateItems = async (newItems: ShoppingListItem[]) => {
    if (!user || !shoppingList) return;

    setSaving(true);
    try {
      const totalPrice = newItems.reduce((sum, item) => {
        return sum + (item.offerPrice || item.price || 0);
      }, 0);

      const { error } = await supabase
        .from('shopping_lists')
        .update({
          items: newItems as unknown as Json,
          total_price: totalPrice,
        })
        .eq('id', shoppingList.id);

      if (error) throw error;

      setShoppingList({
        ...shoppingList,
        items: newItems,
        total_price: totalPrice,
      });
    } catch (err) {
      console.error('Fejl ved opdatering af indkøbsseddel:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!shoppingList) return;

    const newItems = shoppingList.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    await updateItems(newItems);
  };

  const removeItem = async (itemId: string) => {
    if (!shoppingList) return;

    const newItems = shoppingList.items.filter(item => item.id !== itemId);
    await updateItems(newItems);
  };

  const markCompleted = async () => {
    if (!user || !shoppingList) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ completed: true })
        .eq('id', shoppingList.id);

      if (error) throw error;

      setShoppingList(null);
    } catch (err) {
      console.error('Fejl ved afslutning af indkøbsseddel:', err);
    } finally {
      setSaving(false);
    }
  };

  const clearList = async () => {
    if (!user || !shoppingList) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', shoppingList.id);

      if (error) throw error;

      setShoppingList(null);
    } catch (err) {
      console.error('Fejl ved sletning af indkøbsseddel:', err);
    } finally {
      setSaving(false);
    }
  };

  return {
    shoppingList,
    loading,
    saving,
    toggleItem,
    removeItem,
    markCompleted,
    clearList,
    refetch: fetchShoppingList,
  };
}
