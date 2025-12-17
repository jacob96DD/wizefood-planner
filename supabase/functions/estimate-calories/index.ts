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
  "items": [
    { "name": "<madvare navn>", "amount": "<mængde f.eks. '10 stk' eller '5 dage'>", "calories": <tal>, "protein": <tal>, "carbs": <tal>, "fat": <tal> }
  ],
  "total_calories": <sum af alle items>,
  "total_protein": <sum>,
  "total_carbs": <sum>,
  "total_fat": <sum>,
  "per_week": <true hvis ugentligt, false hvis dagligt>
}

=== FEW-SHOT EKSEMPLER ===

Input: "10 øl om ugen"
Output: {"items": [{"name": "Øl", "amount": "10 stk/uge", "calories": 1300, "protein": 10, "carbs": 100, "fat": 0}], "total_calories": 1300, "total_protein": 10, "total_carbs": 100, "total_fat": 0, "per_week": true}

Input: "15 øl i ugen og en Big Mac menu hver lørdag"
Output: {"items": [{"name": "Øl", "amount": "15 stk/uge", "calories": 1950, "protein": 15, "carbs": 150, "fat": 0}, {"name": "Big Mac menu", "amount": "1 stk/uge", "calories": 1100, "protein": 35, "carbs": 110, "fat": 55}], "total_calories": 3050, "total_protein": 50, "total_carbs": 260, "total_fat": 55, "per_week": true}

Input: "frokostordning på arbejde 5 dage om ugen"
Output: {"items": [{"name": "Frokostordning", "amount": "5 dage/uge", "calories": 3000, "protein": 100, "carbs": 300, "fat": 100}], "total_calories": 3000, "total_protein": 100, "total_carbs": 300, "total_fat": 100, "per_week": true}

Input: "pizza om lørdagen og 5 glas vin i weekenden"
Output: {"items": [{"name": "Pizza", "amount": "1 stk/uge", "calories": 1200, "protein": 45, "carbs": 120, "fat": 50}, {"name": "Vin", "amount": "5 glas/uge", "calories": 625, "protein": 0, "carbs": 15, "fat": 0}], "total_calories": 1825, "total_protein": 45, "total_carbs": 135, "total_fat": 50, "per_week": true}

Input: "2 kopper kaffe med mælk dagligt"
Output: {"items": [{"name": "Kaffe med mælk", "amount": "2 kopper/dag", "calories": 50, "protein": 2, "carbs": 4, "fat": 2}], "total_calories": 50, "total_protein": 2, "total_carbs": 4, "total_fat": 2, "per_week": false}

=== REGLER ===
1. Opret ET item per madvare/drikkevare - ALDRIG kombiner forskellige ting i ét item
2. Brug danske portionsstørrelser
3. Reference kalorier:
   - Øl 33cl = 130 kcal
   - Vin 15cl = 125 kcal
   - Big Mac = 550 kcal, Big Mac menu = 1100 kcal
   - Pizza (hel) = 1200 kcal
   - Frokostordning (typisk dansk) = 600 kcal per dag
   - Chili Cheese Top = 55 kcal
4. Hvis mængden er angivet, beregn PRÆCIST
5. per_week: true hvis ugentligt, false hvis dagligt
6. VÆR PRÆCIS - afrund ikke for meget!`;

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
    
    // Calculate weekly calories if per_week is false (daily values)
    const weeklyMultiplier = parsed.per_week ? 1 : 7;
    
    // Transform items with weekly multiplier
    const items = (parsed.items || []).map((item: any) => ({
      name: item.name,
      amount: item.amount,
      calories: Math.round((item.calories || 0) * weeklyMultiplier),
      protein: Math.round((item.protein || 0) * weeklyMultiplier),
      carbs: Math.round((item.carbs || 0) * weeklyMultiplier),
      fat: Math.round((item.fat || 0) * weeklyMultiplier),
    }));
    
    const result = {
      calories_per_week: Math.round((parsed.total_calories || parsed.calories || 0) * weeklyMultiplier),
      protein: Math.round((parsed.total_protein || parsed.protein || 0) * weeklyMultiplier),
      carbs: Math.round((parsed.total_carbs || parsed.carbs || 0) * weeklyMultiplier),
      fat: Math.round((parsed.total_fat || parsed.fat || 0) * weeklyMultiplier),
      calories_per_day: Math.round((parsed.total_calories || parsed.calories || 0) * weeklyMultiplier / 7),
      is_weekly_input: parsed.per_week,
      items,
    };

    console.log('=== FINAL RESULT ===');
    console.log('Input:', description);
    console.log('Weekly calories:', result.calories_per_week);
    console.log('Items:', result.items);

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
