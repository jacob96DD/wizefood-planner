import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface Offer {
  id: string;
  product_name: string | null;
  offer_text: string | null;
  brand: string | null;
  category: string | null;
  unit: string | null;
  quantity: number | null;
  price: number | null;
  offer_price_dkk: number | null;
  original_price_dkk: number | null;
  valid_from: string | null;
  valid_until: string | null;
  image_url: string | null;
  chain_id: string | null;
  chain_name?: string;
}

export function useOffers(shoppingDate?: Date) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchFilteredOffers();
  }, [user, shoppingDate]);

  const fetchFilteredOffers = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Hent brugerens foretrukne butikker
      const { data: preferredChains, error: chainsError } = await supabase
        .from('user_preferred_chains')
        .select('chain_id')
        .eq('user_id', user.id);

      if (chainsError) throw chainsError;

      const chainIds = preferredChains?.map(c => c.chain_id) || [];

      if (chainIds.length === 0) {
        setOffers([]);
        setLoading(false);
        return;
      }

      // Formater dato til YYYY-MM-DD format
      const dateStr = shoppingDate 
        ? shoppingDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Hent tilbud fra foretrukne butikker, gyldige på valgt dato
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select(`
          id,
          product_name,
          offer_text,
          brand,
          category,
          unit,
          quantity,
          price,
          offer_price_dkk,
          original_price_dkk,
          valid_from,
          valid_until,
          image_url,
          chain_id,
          store_chains(name)
        `)
        .in('chain_id', chainIds)
        .lte('valid_from', dateStr)
        .gte('valid_until', dateStr)
        .eq('is_active', true)
        .order('offer_price_dkk', { ascending: true });

      if (offersError) throw offersError;

      const formattedOffers: Offer[] = (offersData || []).map(offer => ({
        ...offer,
        chain_name: (offer.store_chains as { name: string } | null)?.name || 'Ukendt',
      }));

      setOffers(formattedOffers);
    } catch (err) {
      console.error('Fejl ved hentning af tilbud:', err);
      setError('Kunne ikke hente tilbud');
    } finally {
      setLoading(false);
    }
  };

  return { offers, loading, error, refetch: fetchFilteredOffers };
}
