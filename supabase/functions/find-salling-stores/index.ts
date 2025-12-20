import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zip, city, street, radius = 10, latitude, longitude } = await req.json(); // Default 10km radius
    const sallingApiKey = Deno.env.get('SALLING_API_KEY');

    if (!sallingApiKey) {
      throw new Error('SALLING_API_KEY not configured');
    }

    console.log('Finding stores for:', { zip, city, street, radius, latitude, longitude });

    // 1. Brug direkte koordinater hvis de er givet (fra geolocation)
    let lat: number | null = latitude || null;
    let lng: number | null = longitude || null;

    // 2. Ellers geocode adressen med Nominatim (gratis)
    if (!lat || !lng) {
      if (!zip) {
        throw new Error('Postnummer eller lokation er påkrævet');
      }

      // Prøv med fuld adresse først
      if (street && city) {
        const fullAddress = `${street}, ${zip} ${city}, Denmark`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;

        const geoRes = await fetch(geocodeUrl, {
          headers: { 'User-Agent': 'WizeFood/1.0 (meal planning app)' }
        });
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      }

      // Fallback: brug kun postnummer
      if (!lat || !lng) {
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zip}&country=Denmark&limit=1`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'WizeFood/1.0 (meal planning app)' }
        });
        const fallbackData = await fallbackRes.json();

        if (fallbackData.length > 0) {
          lat = parseFloat(fallbackData[0].lat);
          lng = parseFloat(fallbackData[0].lon);
        }
      }
    }

    if (!lat || !lng) {
      throw new Error('Kunne ikke finde koordinater for adressen');
    }

    console.log('Geocoded coordinates:', { lat, lng });

    // 2. Find Salling butikker i radius - hent alle og filtrer på netto/føtex/bilka
    const storesUrl = `https://api.sallinggroup.com/v2/stores?geo=${lat},${lng}&radius=${radius}&per_page=50`;

    console.log('Fetching stores from:', storesUrl);

    const storesRes = await fetch(storesUrl, {
      headers: {
        'Authorization': `Bearer ${sallingApiKey}`,
      }
    });

    console.log('Salling API response status:', storesRes.status);

    if (!storesRes.ok) {
      const errorText = await storesRes.text();
      console.error('Salling API error:', storesRes.status, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Salling API fejl: ${storesRes.status}. Kontakt support.`,
        stores: [],
        latitude: lat,
        longitude: lng,
        radius,
        total: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storesData = await storesRes.json();

    // Check if response is an error object instead of array
    if (!Array.isArray(storesData)) {
      console.error('Salling API returned non-array:', storesData);
      return new Response(JSON.stringify({
        success: false,
        error: storesData.error || 'Uventet svar fra Salling API',
        stores: [],
        latitude: lat,
        longitude: lng,
        radius,
        total: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filtrer til kun netto, føtex, bilka
    const sallingBrands = ['netto', 'foetex', 'bilka'];
    const filteredStores = storesData.filter((store: any) =>
      sallingBrands.includes(store.brand?.toLowerCase())
    );

    console.log('Found stores:', storesData.length, '- After filter:', filteredStores.length);

    // 3. Format response
    const stores = filteredStores.map((store: any) => ({
      id: store.id,
      name: store.name,
      brand: store.brand?.toLowerCase() || 'unknown',
      address: store.address?.street || '',
      city: store.address?.city || '',
      zip: store.address?.zip || '',
      distance: store.distance_km || store.distance || 0,
      coordinates: store.coordinates,
      openingHours: store.hours?.open || null,
    }));

    return new Response(JSON.stringify({
      success: true,
      stores,
      latitude: lat,
      longitude: lng,
      radius,
      total: stores.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in find-salling-stores:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
