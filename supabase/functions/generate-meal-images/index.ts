import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: { name: string; amount: string; unit: string }[];
}

interface ImageResult {
  id: string;
  image_url: string | null;
  error?: string;
}

// Helper to convert base64 data URL to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove the data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client for user auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create admin client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { recipes } = await req.json() as { recipes: MealRecipe[] };

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      throw new Error('No recipes provided');
    }

    console.log(`Generating images for ${recipes.length} recipes in parallel...`);

    // Ensure meal-images bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'meal-images');
    
    if (!bucketExists) {
      console.log('Creating meal-images bucket...');
      await supabaseAdmin.storage.createBucket('meal-images', { 
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
    }

    // Generate images for ALL recipes in parallel using Nano Banana
    const imagePromises = recipes.map(async (recipe): Promise<ImageResult> => {
      try {
        // Build ingredient list for the prompt
        const ingredientList = recipe.ingredients
          .slice(0, 8) // Limit to main ingredients
          .map(i => `- ${i.name}`)
          .join('\n');

        const imagePrompt = `Generate a photorealistic overhead food photograph of "${recipe.title}".

The dish MUST visually show these main ingredients:
${ingredientList}

STYLE REQUIREMENTS:
- Clean white or light ceramic plate
- Overhead/top-down camera angle
- Soft natural daylight lighting from window
- Light wooden table or marble surface background
- Restaurant-quality professional plating
- Appetizing, warm color tones
- Sharp focus with slight depth of field
- Minimal garnish (only fresh herbs if appropriate)
- No text, watermarks, or logos

The image should look like a professional food magazine photo.`;

        console.log(`Generating image for: ${recipe.title}`);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{ role: 'user', content: imagePrompt }],
            modalities: ['image', 'text'],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Image generation failed for ${recipe.title}:`, response.status, errorText);
          
          if (response.status === 429) {
            return { id: recipe.id, image_url: null, error: 'Rate limited' };
          }
          if (response.status === 402) {
            return { id: recipe.id, image_url: null, error: 'Credits exhausted' };
          }
          
          return { id: recipe.id, image_url: null, error: `API error: ${response.status}` };
        }

        const data = await response.json();
        const base64ImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!base64ImageUrl) {
          console.error(`No image returned for ${recipe.title}`);
          return { id: recipe.id, image_url: null, error: 'No image in response' };
        }

        // Upload to Supabase Storage
        try {
          const fileName = `${user.id}/${recipe.id}-${Date.now()}.png`;
          const imageBytes = base64ToUint8Array(base64ImageUrl);
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('meal-images')
            .upload(fileName, imageBytes, {
              contentType: 'image/png',
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload failed for ${recipe.title}:`, uploadError);
            // Return base64 as fallback
            return { id: recipe.id, image_url: base64ImageUrl };
          }

          // Get public URL
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('meal-images')
            .getPublicUrl(fileName);

          console.log(`Successfully uploaded image for: ${recipe.title}`);
          return { id: recipe.id, image_url: publicUrlData.publicUrl };

        } catch (uploadErr) {
          console.error(`Upload error for ${recipe.title}:`, uploadErr);
          // Return base64 as fallback
          return { id: recipe.id, image_url: base64ImageUrl };
        }

      } catch (error) {
        console.error(`Error generating image for ${recipe.title}:`, error);
        return { 
          id: recipe.id, 
          image_url: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Wait for all images to be generated in parallel
    const results = await Promise.all(imagePromises);

    const successCount = results.filter(r => r.image_url).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`Image generation complete: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      images: results,
      summary: {
        total: recipes.length,
        success: successCount,
        errors: errorCount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meal-images:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
