import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface FoodwasteProduct {
  id: string;
  store_id: string;
  store_name: string;
  brand: string;
  zip: string;
  ean: string;
  product_description: string;
  product_image: string | null;
  original_price: number;
  new_price: number;
  percent_discount: number;
  stock: number;
  stock_unit: string;
  end_time: string;
}

export interface UserSallingStore {
  store_id: string;
  store_name: string;
  brand: string;
  zip: string;
}

export function useFoodwaste() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<FoodwasteProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [userStores, setUserStores] = useState<UserSallingStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hent brugerens Salling butikker og deres foodwaste
  useEffect(() => {
    if (!user) return;
    fetchFoodwaste();
  }, [user]);

  const fetchFoodwaste = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Hent brugerens valgte Salling butikker
      const { data: stores, error: storesError } = await supabase
        .from('user_salling_stores')
        .select('store_id, store_name, brand, zip')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (storesError) throw storesError;

      if (!stores || stores.length === 0) {
        setProducts([]);
        setUserStores([]);
        return;
      }

      setUserStores(stores);

      // 2. Hent unikke postnumre
      const zipCodes = [...new Set(stores.map(s => s.zip))];

      // 3. Hent foodwaste fra disse postnumre
      const { data: foodwaste, error: foodwasteError } = await supabase
        .from('foodwaste')
        .select('*')
        .eq('is_active', true)
        .in('zip', zipCodes)
        .gt('end_time', new Date().toISOString())
        .order('percent_discount', { ascending: false });

      if (foodwasteError) throw foodwasteError;

      // 4. Filtrer til kun butikker brugeren har valgt
      const storeIds = new Set(stores.map(s => s.store_id));
      const filteredProducts = (foodwaste || []).filter(p => storeIds.has(p.store_id));

      setProducts(filteredProducts);
    } catch (err) {
      console.error('Error fetching foodwaste:', err);
      setError('Kunne ikke hente madspild produkter');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  };

  const clearAll = () => {
    setSelectedProducts(new Set());
  };

  const getSelectedProducts = (): FoodwasteProduct[] => {
    return products.filter(p => selectedProducts.has(p.id));
  };

  return {
    products,
    selectedProducts,
    userStores,
    loading,
    error,
    toggleProduct,
    selectAll,
    clearAll,
    getSelectedProducts,
    refetch: fetchFoodwaste,
    hasStores: userStores.length > 0,
  };
}
