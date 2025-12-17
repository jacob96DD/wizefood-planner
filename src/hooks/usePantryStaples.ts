import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PantryStaple {
  id: string;
  name: string;
  category: string;
  icon: string | null;
}

interface StapleOffer {
  staple: PantryStaple;
  offer: {
    id: string;
    product_name: string;
    offer_price_dkk: number;
    original_price_dkk: number | null;
    chain_name: string;
    valid_until: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  krydderier: 'Krydderier',
  olie_fedt: 'Olie & Fedt',
  bagning: 'Bagning & Grundvarer',
  konserves: 'Konserves & Sauce',
  andet: 'Andet',
};

export const usePantryStaples = () => {
  const [staples, setStaples] = useState<PantryStaple[]>([]);
  const [stapleOffers, setStapleOffers] = useState<StapleOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaplesAndOffers();
  }, []);

  const fetchStaplesAndOffers = async () => {
    try {
      setLoading(true);

      // Fetch pantry staples
      const { data: staplesData, error: staplesError } = await supabase
        .from('pantry_staples')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (staplesError) throw staplesError;
      setStaples(staplesData || []);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's preferred chains
      const { data: preferredChains } = await supabase
        .from('user_preferred_chains')
        .select('chain_id')
        .eq('user_id', user.id);

      if (!preferredChains || preferredChains.length === 0) {
        setLoading(false);
        return;
      }

      const chainIds = preferredChains.map(pc => pc.chain_id);

      // Fetch active offers from preferred chains with chain names
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select(`
          id,
          product_name,
          offer_price_dkk,
          original_price_dkk,
          valid_until,
          chain_id,
          store_chains!offers_chain_id_fkey(name)
        `)
        .in('chain_id', chainIds)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString().split('T')[0]);

      if (offersError) throw offersError;

      // Match offers to pantry staples (fuzzy matching)
      const matchedOffers: StapleOffer[] = [];
      
      for (const staple of (staplesData || [])) {
        const stapleLower = staple.name.toLowerCase();
        
        for (const offer of (offers || [])) {
          if (!offer.product_name) continue;
          
          const productLower = offer.product_name.toLowerCase();
          
          // Check if product name contains staple name or vice versa
          if (productLower.includes(stapleLower) || stapleLower.includes(productLower)) {
            const chainName = (offer.store_chains as any)?.name || 'Ukendt butik';
            
            matchedOffers.push({
              staple,
              offer: {
                id: offer.id,
                product_name: offer.product_name,
                offer_price_dkk: offer.offer_price_dkk || 0,
                original_price_dkk: offer.original_price_dkk,
                chain_name: chainName,
                valid_until: offer.valid_until || '',
              },
            });
            break; // Only one offer per staple
          }
        }
      }

      setStapleOffers(matchedOffers);
    } catch (error) {
      console.error('Error fetching pantry staples:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStaplesByCategory = () => {
    const grouped: Record<string, PantryStaple[]> = {};
    
    for (const staple of staples) {
      const category = staple.category || 'andet';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(staple);
    }
    
    return grouped;
  };

  return {
    staples,
    stapleOffers,
    loading,
    getStaplesByCategory,
    categoryLabels: CATEGORY_LABELS,
    refetch: fetchStaplesAndOffers,
  };
};
