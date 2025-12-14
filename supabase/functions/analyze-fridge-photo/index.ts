import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  category: 'fridge' | 'freezer' | 'pantry';
  confidence: 'high' | 'medium' | 'low';
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

    const { image } = await req.json() as { image: string };

    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Analyzing fridge photo with Claude Sonnet 4...');

    // Use Claude Sonnet 4 with vision via Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          {
            role: 'system',
            content: `Du er en ekspert i at analysere billeder af køleskabe og identificere madvarer.
            
Din opgave er at:
1. Identificere ALLE synlige madvarer i billedet
2. Estimere mængder hvor muligt
3. Kategorisere hver vare (fridge, freezer, pantry)
4. Angive din sikkerhed på identifikationen

Returner ALTID et JSON array med objekter i dette format:
{
  "ingredients": [
    {
      "name": "kyllingebryst",
      "quantity": 2,
      "unit": "stk",
      "category": "fridge",
      "confidence": "high"
    }
  ]
}

Brug danske navne for ingredienser. Vær specifik (f.eks. "hakket oksekød" i stedet for bare "kød").
Estimer kun mængder hvis du kan se dem tydeligt.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analysér dette billede og identificer alle madvarer du kan se. Returner kun JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit nået. Prøv igen om lidt.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Kredit opbrugt. Tilføj flere kreditter.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Claude response:', content);

    // Parse the JSON response
    let ingredients: DetectedIngredient[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        ingredients = parsed.ingredients || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract array directly
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        ingredients = JSON.parse(arrayMatch[0]);
      }
    }

    console.log(`Found ${ingredients.length} ingredients`);

    return new Response(JSON.stringify({
      success: true,
      ingredients,
      count: ingredients.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-fridge-photo:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
