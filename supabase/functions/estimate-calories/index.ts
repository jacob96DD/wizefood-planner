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

    console.log('Estimating calories for:', description);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du er en ernæringsekspert der estimerer kalorier og makroer fra fødevarer.
            
VIGTIG: Du skal svare KUN med valid JSON i følgende format:
{
  "calories": <tal>,
  "protein": <tal i gram>,
  "carbs": <tal i gram>,
  "fat": <tal i gram>,
  "per_week": <true hvis ugentligt, false hvis dagligt>
}

Regler:
- Estimer baseret på typiske danske portionsstørrelser
- Hvis mængden er angivet (f.eks. "10 øl"), beregn totalen
- Hvis det er noget der normalt indtages ugentligt (f.eks. "10 øl om ugen"), sæt per_week: true
- Hvis det er noget dagligt (f.eks. "2 kopper kaffe med mælk"), sæt per_week: false og estimer dagligt forbrug
- Vær realistisk med portionstørrelser
- Rund tal af til hele tal`
          },
          {
            role: 'user',
            content: `Estimer kalorier og makroer for: "${description}"`
          }
        ],
        temperature: 0.3,
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

    console.log('AI response:', content);

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    
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
    };

    console.log('Returning result:', result);

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
