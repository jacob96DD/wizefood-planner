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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { recipes } = await req.json() as { recipes: MealRecipe[] };

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      throw new Error('No recipes provided');
    }

    console.log(`Generating images for ${recipes.length} recipes in parallel...`);

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
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          console.error(`No image returned for ${recipe.title}`);
          return { id: recipe.id, image_url: null, error: 'No image in response' };
        }

        console.log(`Successfully generated image for: ${recipe.title}`);
        return { id: recipe.id, image_url: imageUrl };

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
