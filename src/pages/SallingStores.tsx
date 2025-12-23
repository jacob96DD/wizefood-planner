import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Loader2, Leaf, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { BottomNavigation } from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SallingStore {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  zip: string;
  distance: number;
}

export default function SallingStores() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stores, setStores] = useState<SallingStore[]>([]);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load user's saved stores
  useEffect(() => {
    if (!user) return;

    const fetchSavedStores = async () => {
      const { data, error } = await supabase
        .from('user_salling_stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const savedIds = new Set(data.map(s => s.store_id));
        setSelectedStores(savedIds);
        setRadius(data[0].radius_km || 5);

        // Use saved location
        if (data[0].latitude && data[0].longitude) {
          setUserLocation({ lat: data[0].latitude, lng: data[0].longitude });
          // Fetch stores with saved location
          findStores(data[0].latitude, data[0].longitude, data[0].radius_km || 5);
        }
      }
    };

    fetchSavedStores();
  }, [user]);

  const findStores = async (lat: number, lng: number, radiusKm: number) => {
    console.log('[SallingStores] findStores called:', { lat, lng, radiusKm });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-salling-stores', {
        body: { latitude: lat, longitude: lng, radius: radiusKm }
      });

      console.log('[SallingStores] findStores response:', { data, error });
      if (error) throw error;

      if (data.success && data.stores) {
        console.log('[SallingStores] Found stores:', data.stores.length);
        setStores(data.stores);
      } else {
        console.warn('[SallingStores] No stores in response:', data);
      }
    } catch (error) {
      console.error('[SallingStores] Error finding stores:', error);
      toast.error('Kunne ikke finde butikker');
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocation = () => {
    console.log('[SallingStores] handleUseLocation called');
    setLocationLoading(true);

    if (!navigator.geolocation) {
      console.error('[SallingStores] Geolocation not supported');
      toast.error('Din browser understøtter ikke geolocation');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[SallingStores] Got position:', latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });
        findStores(latitude, longitude, radius);
        setLocationLoading(false);
      },
      (error) => {
        console.error('[SallingStores] Geolocation error:', error.code, error.message);
        if (error.code === 1) {
          toast.error('Lokationstilladelse nægtet - tillad i browserindstillinger');
        } else if (error.code === 2) {
          toast.error('Kunne ikke bestemme position');
        } else if (error.code === 3) {
          toast.error('Timeout ved hentning af lokation');
        } else {
          toast.error('Kunne ikke hente din lokation');
        }
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    if (userLocation) {
      findStores(userLocation.lat, userLocation.lng, newRadius);
    }
  };

  const handleToggleStore = (storeId: string) => {
    setSelectedStores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!user || !userLocation) {
      toast.error('Brug din lokation først');
      return;
    }

    setSaving(true);
    try {
      // Delete existing stores
      await supabase
        .from('user_salling_stores')
        .delete()
        .eq('user_id', user.id);

      // Insert selected stores
      if (selectedStores.size > 0) {
        const storesToInsert = stores
          .filter(s => selectedStores.has(s.id))
          .map(s => ({
            user_id: user.id,
            store_id: s.id,
            store_name: s.name,
            brand: s.brand,
            address: s.address,
            city: s.city,
            zip: s.zip,
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            radius_km: radius,
            is_active: true,
          }));

        const { error } = await supabase
          .from('user_salling_stores')
          .insert(storesToInsert);

        if (error) throw error;
      }

      toast.success('Salling butikker gemt');
      navigate(-1);
    } catch (error) {
      console.error('Error saving stores:', error);
      toast.error('Kunne ikke gemme butikker');
    } finally {
      setSaving(false);
    }
  };

  const getBrandColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'netto': return 'bg-yellow-500';
      case 'foetex': return 'bg-red-500';
      case 'bilka': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Madspild
              </h1>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || selectedStores.size === 0}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Gem
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Description */}
        <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            Vælg Salling butikker (Netto, Føtex, Bilka) i nærheden for at se deres madspild-tilbud og få dem med i din madplan.
          </p>
        </Card>

        {/* Location button */}
        <Button
          onClick={handleUseLocation}
          disabled={locationLoading}
          className="w-full"
          variant="outline"
        >
          {locationLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 mr-2" />
          )}
          Brug min lokation
        </Button>

        {/* Radius slider */}
        {userLocation && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Søgeradius</span>
              <span className="text-primary font-semibold">{radius} km</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={handleRadiusChange}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Finder butikker...</span>
          </div>
        )}

        {/* Store list */}
        {!loading && stores.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {stores.length} butikker fundet • {selectedStores.size} valgt
            </p>
            {stores.map((store) => {
              const isSelected = selectedStores.has(store.id);
              return (
                <Card
                  key={store.id}
                  className={cn(
                    "p-4 flex items-center justify-between cursor-pointer select-none active:scale-[0.98] transition-transform",
                    isSelected ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "opacity-70"
                  )}
                  onClick={() => handleToggleStore(store.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-white",
                      getBrandColor(store.brand)
                    )}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-medium block">{store.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {store.address}, {store.city} • {store.distance.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleToggleStore(store.id)}
                  />
                </Card>
              );
            })}
          </div>
        )}

        {/* No stores */}
        {!loading && userLocation && stores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Ingen butikker fundet i din radius</p>
            <p className="text-sm">Prøv at øge radius</p>
          </div>
        )}

        {/* No location */}
        {!userLocation && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Tryk på "Brug min lokation" for at finde butikker</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
