import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const sallingApiKey = Deno.env.get('SALLING_API_KEY');

    if (!sallingApiKey) {
      throw new Error('SALLING_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // 1. Hent brugerens valgte Salling butikker
    const { data: userStores, error: storesError } = await supabase
      .from('user_salling_stores')
      .select('salling_store_id, store_name, brand')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (storesError) {
      console.error('Error fetching user stores:', storesError);
    }

    if (!userStores?.length) {
      return new Response(JSON.stringify({
        success: true,
        products: [],
        message: 'Ingen butikker valgt. Vælg butikker i din profil.',
        stores_checked: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching food waste for', userStores.length, 'stores');

    // 2. Hent food waste for hver butik
    const allProducts: any[] = [];
    const errors: string[] = [];

    for (const store of userStores) {
      try {
        const foodWasteUrl = `https://api.sallinggroup.com/v1/food-waste/${store.salling_store_id}`;

        console.log('Fetching food waste from:', foodWasteUrl);

        const res = await fetch(foodWasteUrl, {
          headers: { 'Authorization': `Bearer ${sallingApiKey}` }
        });

        if (!res.ok) {
          console.warn(`Food waste fetch failed for store ${store.salling_store_id}:`, res.status);
          errors.push(`${store.store_name}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const clearances = data.clearances || [];

        console.log(`Store ${store.store_name}: ${clearances.length} products`);

        // 3. Gem i database for caching
        for (const clearance of clearances) {
          const product = {
            salling_store_id: store.salling_store_id,
            store_name: store.store_name,
            brand: store.brand,
            ean: clearance.product?.ean || `unknown-${Date.now()}-${Math.random()}`,
            product_name: clearance.product?.description || 'Ukendt produkt',
            product_description: clearance.product?.description || '',
            image_url: clearance.product?.image || null,
            original_price: clearance.offer?.originalPrice || 0,
            new_price: clearance.offer?.newPrice || 0,
            discount_percent: clearance.offer?.percentDiscount || 0,
            stock: clearance.offer?.stock || null,
            valid_from: clearance.offer?.startTime || new Date().toISOString(),
            valid_until: clearance.offer?.endTime || new Date().toISOString(),
            last_synced: new Date().toISOString(),
          };

          allProducts.push(product);

          // Upsert til database (ignore errors for individual products)
          const { error: upsertError } = await supabase
            .from('food_waste_products')
            .upsert(product, { onConflict: 'salling_store_id,ean' });

          if (upsertError) {
            console.warn('Upsert error for product:', upsertError.message);
          }
        }
      } catch (err) {
        console.error(`Error fetching store ${store.salling_store_id}:`, err);
        errors.push(`${store.store_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Sortér efter rabat
    allProducts.sort((a, b) => b.discount_percent - a.discount_percent);

    return new Response(JSON.stringify({
      success: true,
      products: allProducts,
      stores_checked: userStores.length,
      total_products: allProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-food-waste:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
