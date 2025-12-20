import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Danske postnumre opdelt i regioner for at dække hele landet
const DANISH_ZIP_CODES = [
  // København og omegn
  '1000', '1500', '2000', '2100', '2200', '2300', '2400', '2450', '2500',
  '2600', '2605', '2610', '2620', '2625', '2630', '2635', '2640', '2650',
  '2660', '2665', '2670', '2680', '2690', '2700', '2720', '2730', '2740',
  '2750', '2760', '2765', '2770', '2791', '2800', '2820', '2830', '2840',
  '2850', '2860', '2870', '2880', '2900', '2920', '2930', '2942', '2950',
  '2960', '2970', '2980', '2990',
  // Nordsjælland
  '3000', '3050', '3060', '3070', '3080', '3100', '3120', '3140', '3150',
  '3200', '3210', '3220', '3230', '3250', '3300', '3320', '3360', '3400',
  '3450', '3460', '3480', '3490', '3500', '3520', '3540', '3550', '3600',
  '3630', '3650', '3660', '3670',
  // Sjælland
  '4000', '4100', '4200', '4220', '4230', '4241', '4250', '4270', '4281',
  '4293', '4296', '4300', '4320', '4330', '4340', '4350', '4360', '4370',
  '4390', '4400', '4420', '4440', '4450', '4460', '4480', '4490', '4500',
  '4520', '4534', '4540', '4550', '4560', '4571', '4572', '4573', '4581',
  '4583', '4591', '4593', '4600', '4621', '4622', '4623', '4632', '4652',
  '4653', '4654', '4660', '4671', '4672', '4673', '4681', '4682', '4683',
  '4684', '4690', '4700', '4720', '4733', '4735', '4736', '4750', '4760',
  '4771', '4772', '4773', '4780', '4791', '4792', '4793', '4800', '4840',
  '4850', '4862', '4863', '4871', '4872', '4873', '4874', '4880', '4891',
  '4892', '4894', '4895', '4900', '4912', '4913', '4920', '4930', '4941',
  '4943', '4944', '4945', '4951', '4952', '4953', '4960', '4970', '4983',
  '4990',
  // Fyn
  '5000', '5200', '5210', '5220', '5230', '5240', '5250', '5260', '5270',
  '5290', '5300', '5320', '5330', '5350', '5370', '5380', '5390', '5400',
  '5450', '5462', '5463', '5464', '5466', '5471', '5474', '5485', '5491',
  '5492', '5500', '5540', '5550', '5560', '5580', '5591', '5592', '5600',
  '5610', '5620', '5631', '5642', '5672', '5683', '5690', '5700', '5750',
  '5762', '5771', '5772', '5792', '5800', '5853', '5854', '5856', '5863',
  '5871', '5874', '5881', '5882', '5883', '5884', '5892', '5900', '5932',
  '5935', '5953', '5960', '5970', '5985',
  // Jylland Syd
  '6000', '6040', '6051', '6052', '6064', '6070', '6091', '6092', '6093',
  '6094', '6100', '6200', '6230', '6240', '6261', '6270', '6280', '6300',
  '6310', '6320', '6330', '6340', '6360', '6372', '6392', '6400', '6430',
  '6470', '6500', '6510', '6520', '6534', '6535', '6541', '6560', '6580',
  '6600', '6621', '6622', '6623', '6630', '6640', '6650', '6660', '6670',
  '6682', '6683', '6690', '6700', '6705', '6710', '6715', '6720', '6731',
  '6740', '6752', '6753', '6760', '6771', '6780', '6792', '6800', '6818',
  '6823', '6830', '6840', '6851', '6852', '6853', '6854', '6855', '6857',
  '6862', '6870', '6880', '6893', '6900', '6920', '6933', '6940', '6950',
  '6960', '6971', '6973', '6980', '6990',
  // Jylland Midt
  '7000', '7080', '7100', '7120', '7130', '7140', '7150', '7160', '7171',
  '7173', '7182', '7183', '7184', '7190', '7200', '7250', '7260', '7270',
  '7280', '7300', '7321', '7323', '7330', '7361', '7362', '7400', '7430',
  '7441', '7442', '7451', '7470', '7480', '7490', '7500', '7540', '7550',
  '7560', '7570', '7600', '7620', '7650', '7660', '7673', '7680', '7700',
  '7730', '7741', '7742', '7752', '7755', '7760', '7770', '7790', '7800',
  '7830', '7840', '7850', '7860', '7870', '7884', '7900', '7950', '7960',
  '7970', '7980', '7990',
  // Jylland Nord
  '8000', '8200', '8210', '8220', '8230', '8240', '8250', '8260', '8270',
  '8300', '8305', '8310', '8320', '8330', '8340', '8350', '8355', '8361',
  '8362', '8370', '8380', '8381', '8382', '8400', '8410', '8420', '8450',
  '8462', '8464', '8471', '8472', '8500', '8520', '8530', '8541', '8543',
  '8544', '8550', '8560', '8570', '8581', '8585', '8586', '8592', '8600',
  '8620', '8632', '8641', '8643', '8653', '8654', '8660', '8670', '8680',
  '8700', '8721', '8722', '8723', '8732', '8740', '8751', '8752', '8762',
  '8763', '8765', '8766', '8781', '8783', '8800', '8830', '8831', '8832',
  '8840', '8850', '8860', '8870', '8881', '8882', '8883', '8900', '8920',
  '8930', '8940', '8950', '8960', '8961', '8963', '8970', '8981', '8983',
  '8990',
  // Nordjylland
  '9000', '9200', '9210', '9220', '9230', '9240', '9260', '9270', '9280',
  '9293', '9300', '9310', '9320', '9330', '9340', '9352', '9362', '9370',
  '9380', '9381', '9382', '9400', '9430', '9440', '9460', '9480', '9490',
  '9492', '9493', '9500', '9510', '9520', '9530', '9541', '9550', '9560',
  '9574', '9575', '9600', '9610', '9620', '9631', '9632', '9640', '9670',
  '9681', '9690', '9700', '9740', '9750', '9760', '9800', '9830', '9850',
  '9870', '9881', '9900', '9940', '9970', '9981', '9982', '9990',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sallingApiKey = Deno.env.get('SALLING_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Env check - SALLING_API_KEY:', !!sallingApiKey);
    console.log('Env check - SUPABASE_URL:', !!supabaseUrl);
    console.log('Env check - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);

    if (!sallingApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error(`Missing required environment variables: SALLING=${!!sallingApiKey}, URL=${!!supabaseUrl}, KEY=${!!supabaseServiceKey}`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('foodwaste')
      .select('count')
      .limit(1);

    console.log('DB test:', testError ? `Error: ${testError.message}` : 'Connected');

    // Parse request body for optional zip filter
    let zipCodes = DANISH_ZIP_CODES;
    try {
      const body = await req.json();
      if (body.zip_codes && Array.isArray(body.zip_codes)) {
        zipCodes = body.zip_codes;
      } else if (body.zip) {
        zipCodes = [body.zip];
      }
    } catch {
      // Use default zip codes if no body
    }

    console.log(`Fetching foodwaste for ${zipCodes.length} zip codes...`);

    let totalItems = 0;
    let successfulZips = 0;
    let errors = 0;
    let dbErrors: string[] = [];
    let processedStores: string[] = [];

    // Process zip codes in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < zipCodes.length; i += batchSize) {
      const batch = zipCodes.slice(i, i + batchSize);

      await Promise.all(batch.map(async (zip) => {
        try {
          const response = await fetch(
            `https://api.sallinggroup.com/v1/food-waste?zip=${zip}`,
            {
              headers: {
                'Authorization': `Bearer ${sallingApiKey}`,
              }
            }
          );

          if (response.status === 429) {
            // Rate limited - wait and skip
            console.log(`Rate limited for zip ${zip}`);
            return;
          }

          if (!response.ok) {
            console.error(`Error for zip ${zip}: ${response.status}`);
            errors++;
            return;
          }

          const stores = await response.json();

          if (!Array.isArray(stores) || stores.length === 0) {
            return;
          }

          successfulZips++;
          console.log(`Processing ${stores.length} stores for zip ${zip}`);

          // Process each store's clearances
          for (const storeData of stores) {
            if (!storeData.clearances || !Array.isArray(storeData.clearances)) continue;

            const storeInfo = storeData.store;
            const storeId = storeInfo?.id || `unknown-${zip}`;
            const storeName = storeInfo?.name || 'Unknown Store';
            const brand = storeInfo?.brand?.toLowerCase() || 'unknown';
            const storeZip = storeInfo?.address?.zip || zip;

            console.log(`Store: ${storeName} (${storeId}) - ${storeData.clearances.length} items`);
            processedStores.push(`${storeName}: ${storeData.clearances.length} items`);

            for (const item of storeData.clearances) {
              const offer = item.offer;
              const product = item.product;

              if (!offer || !product) continue;

              const foodwasteItem = {
                store_id: storeId,
                store_name: storeName,
                brand: brand,
                zip: storeZip,
                ean: offer.ean || `${storeId}-${product.ean}`,
                product_ean: product.ean,
                product_description: product.description || 'Ukendt produkt',
                product_image: product.image,
                product_categories: product.categories || {},
                original_price: offer.originalPrice,
                new_price: offer.newPrice,
                discount: offer.discount,
                percent_discount: offer.percentDiscount,
                stock: offer.stock,
                stock_unit: offer.stockUnit,
                start_time: offer.startTime,
                end_time: offer.endTime,
                last_update: offer.lastUpdate,
                fetched_at: new Date().toISOString(),
                is_active: true,
              };

              // Upsert foodwaste item
              const { error } = await supabase
                .from('foodwaste')
                .upsert(foodwasteItem, { onConflict: 'store_id,ean' });

              if (error) {
                console.error('Error upserting foodwaste:', error.message, foodwasteItem.product_description);
                dbErrors.push(`${error.message}: ${foodwasteItem.product_description}`);
              } else {
                totalItems++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing zip ${zip}:`, error);
          errors++;
        }
      }));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < zipCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Mark expired items as inactive
    const { error: expireError } = await supabase
      .from('foodwaste')
      .update({ is_active: false })
      .lt('end_time', new Date().toISOString());

    if (expireError) {
      console.error('Error marking expired items:', expireError);
    }

    console.log(`Completed: ${totalItems} items from ${successfulZips} zips, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      total_items: totalItems,
      successful_zips: successfulZips,
      errors,
      message: `Fetched ${totalItems} foodwaste items from ${successfulZips} zip codes`,
      debug: {
        stores_processed: processedStores.slice(0, 5),
        db_errors: dbErrors.slice(0, 5),
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-foodwaste:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
