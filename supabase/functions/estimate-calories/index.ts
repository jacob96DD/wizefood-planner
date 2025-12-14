import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    
    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== ESTIMATE CALORIES REQUEST ===');
    console.log('Input:', description);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Du er en PRÆCIS ernæringsekspert der estimerer kalorier og makroer fra fødevarer.

VIGTIG: Du skal svare KUN med valid JSON i følgende format:
{
  "calories": <tal>,
  "protein": <tal i gram>,
  "carbs": <tal i gram>,
  "fat": <tal i gram>,
  "per_week": <true hvis ugentligt, false hvis dagligt>,
  "calculation": "<kort forklaring af beregningen>"
}

=== FEW-SHOT EKSEMPLER ===

Input: "10 øl om ugen"
Output: {"calories": 1300, "protein": 10, "carbs": 100, "fat": 0, "per_week": true, "calculation": "10 øl × 130 kcal = 1300 kcal"}

Input: "1 Big Mac menu hver lørdag"
Output: {"calories": 1100, "protein": 35, "carbs": 110, "fat": 55, "per_week": true, "calculation": "Big Mac (550) + pommes frites (340) + cola (210) = 1100 kcal"}

Input: "15 øl i ugen og en Big Mac menu med 20 chili cheese tops hver lørdag"
Output: {"calories": 4150, "protein": 95, "carbs": 350, "fat": 180, "per_week": true, "calculation": "15 øl × 130 = 1950 kcal + Big Mac menu 1100 kcal + 20 chili cheese × 55 = 1100 kcal = 4150 kcal total"}

Input: "nutella mad hver dag"
Output: {"calories": 310, "protein": 7, "carbs": 45, "fat": 11, "per_week": false, "calculation": "2 skiver brød (150 kcal) + 30g nutella (160 kcal) = 310 kcal dagligt"}

Input: "5 glas rødvin om ugen"
Output: {"calories": 625, "protein": 0, "carbs": 15, "fat": 0, "per_week": true, "calculation": "5 glas × 125 kcal = 625 kcal"}

Input: "2 kopper kaffe med mælk dagligt"
Output: {"calories": 50, "protein": 2, "carbs": 4, "fat": 2, "per_week": false, "calculation": "2 kopper × 25 kcal (med mælk) = 50 kcal dagligt"}

=== REGLER ===
1. Beregn ALTID item for item når der er flere ting - læg dem sammen til sidst
2. Brug danske portionsstørrelser
3. Reference kalorier:
   - Øl 33cl = 130 kcal
   - Vin 15cl = 125 kcal
   - Big Mac = 550 kcal
   - Big Mac menu = 1100 kcal (burger + pommes + cola)
   - Chili Cheese Top = 55 kcal
   - Toast med nutella = 310 kcal
4. Hvis mængden er angivet (f.eks. "10 øl"), beregn PRÆCIST: mængde × kalorier per stk
5. Hvis det er noget der normalt indtages ugentligt, sæt per_week: true
6. Hvis det er noget dagligt, sæt per_week: false
7. VÆR PRÆCIS - afrund ikke for meget op!
8. Vis altid beregningen i "calculation" feltet`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Estimer kalorier og makroer for: "${description}"` }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI raw response:', content);

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    
    console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    console.log('AI calculation:', parsed.calculation || 'No calculation provided');
    
    // Calculate weekly calories if per_week is false (daily values)
    const weeklyMultiplier = parsed.per_week ? 1 : 7;
    
    const result = {
      calories_per_week: Math.round(parsed.calories * weeklyMultiplier),
      protein: Math.round((parsed.protein || 0) * weeklyMultiplier),
      carbs: Math.round((parsed.carbs || 0) * weeklyMultiplier),
      fat: Math.round((parsed.fat || 0) * weeklyMultiplier),
      // Also return daily values for display
      calories_per_day: Math.round(parsed.calories * weeklyMultiplier / 7),
      is_weekly_input: parsed.per_week,
      calculation: parsed.calculation || null,
    };

    console.log('=== FINAL RESULT ===');
    console.log('Input:', description);
    console.log('Weekly calories:', result.calories_per_week);
    console.log('Daily calories:', result.calories_per_day);
    console.log('Calculation:', result.calculation);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in estimate-calories:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
