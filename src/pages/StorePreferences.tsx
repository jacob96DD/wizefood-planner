import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Store, Loader2 } from 'lucide-react';
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
  const [initialChains, setInitialChains] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasChanges = useRef(false);

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
        setInitialChains(new Set(preferredIds));
      } catch (error) {
        console.error('Error fetching store data:', error);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, t]);

  // Toggle locally without saving to database
  const handleToggle = (chainId: string) => {
    setSelectedChains(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(chainId)) {
        newSelected.delete(chainId);
      } else {
        newSelected.add(chainId);
      }
      hasChanges.current = true;
      return newSelected;
    });
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (selectedChains.size !== initialChains.size) return true;
    for (const id of selectedChains) {
      if (!initialChains.has(id)) return true;
    }
    return false;
  };

  // Save all changes to database
  const handleSave = async () => {
    if (!user || !hasUnsavedChanges()) {
      navigate(-1);
      return;
    }

    setSaving(true);

    try {
      // Delete all existing preferences
      await supabase
        .from('user_preferred_chains')
        .delete()
        .eq('user_id', user.id);

      // Insert new preferences
      if (selectedChains.size > 0) {
        const chainsToInsert = Array.from(selectedChains).map((chainId) => ({
          user_id: user.id,
          chain_id: chainId,
        }));

        const { error } = await supabase
          .from('user_preferred_chains')
          .insert(chainsToInsert);

        if (error) throw error;
      }

      toast.success(t('stores.saved', 'Butikker gemt'));
      navigate(-1);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
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
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{t('stores.title')}</h1>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common.save')}
          </Button>
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
