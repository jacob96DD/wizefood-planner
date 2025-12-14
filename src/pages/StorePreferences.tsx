import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { BottomNavigation } from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface StoreChain {
  id: string;
  name: string;
}

export default function StorePreferences() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [storeChains, setStoreChains] = useState<StoreChain[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        // Fetch all store chains
        const { data: chains, error: chainsError } = await supabase
          .from('store_chains')
          .select('id, name')
          .order('name');
        
        if (chainsError) throw chainsError;
        setStoreChains(chains || []);

        // Fetch user's preferred chains
        const { data: preferences, error: prefsError } = await supabase
          .from('user_preferred_chains')
          .select('chain_id')
          .eq('user_id', user.id);
        
        if (prefsError) throw prefsError;
        
        const preferredIds = new Set(preferences?.map(p => p.chain_id) || []);
        setSelectedChains(preferredIds);
      } catch (error) {
        console.error('Error fetching store data:', error);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, t]);

  const handleToggle = async (chainId: string) => {
    if (!user) return;
    
    const newSelected = new Set(selectedChains);
    const isCurrentlySelected = newSelected.has(chainId);

    // Optimistic update
    if (isCurrentlySelected) {
      newSelected.delete(chainId);
    } else {
      newSelected.add(chainId);
    }
    setSelectedChains(newSelected);

    try {
      if (isCurrentlySelected) {
        // Remove preference
        const { error } = await supabase
          .from('user_preferred_chains')
          .delete()
          .eq('user_id', user.id)
          .eq('chain_id', chainId);
        
        if (error) throw error;
      } else {
        // Add preference
        const { error } = await supabase
          .from('user_preferred_chains')
          .insert({ user_id: user.id, chain_id: chainId });
        
        if (error) throw error;
      }
    } catch (error) {
      // Revert on error
      if (isCurrentlySelected) {
        newSelected.add(chainId);
      } else {
        newSelected.delete(chainId);
      }
      setSelectedChains(newSelected);
      console.error('Error updating preference:', error);
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{t('stores.title')}</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Description */}
        <p className="text-muted-foreground">{t('stores.description')}</p>

        {/* Store chains list */}
        <div className="space-y-3">
          {storeChains.map((chain) => (
            <Card 
              key={chain.id} 
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">{chain.name}</span>
              </div>
              <Switch
                checked={selectedChains.has(chain.id)}
                onCheckedChange={() => handleToggle(chain.id)}
              />
            </Card>
          ))}
        </div>

        {storeChains.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t('stores.noStores')}
          </p>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
