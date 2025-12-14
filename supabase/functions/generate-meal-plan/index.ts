import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealPlanRequest {
  duration_days: number;
  start_date: string;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { duration_days = 7, start_date } = await req.json() as MealPlanRequest;
    const startDate = start_date ? new Date(start_date) : new Date();

    // Hent brugerens profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Hent brugerens allergener
    const { data: userAllergens } = await supabase
      .from('user_allergens')
      .select('allergen_id, allergens(name)')
      .eq('user_id', user.id);

    const allergenNames = userAllergens?.map((ua: any) => ua.allergens?.name).filter(Boolean) || [];

    // Hent brugerens foretrukne butikker
    const { data: preferredChains } = await supabase
      .from('user_preferred_chains')
      .select('chain_id, store_chains(name)')
      .eq('user_id', user.id);

    const chainIds = preferredChains?.map((pc: any) => pc.chain_id) || [];
    const chainNames = preferredChains?.map((pc: any) => pc.store_chains?.name).filter(Boolean) || [];

    // Hent brugerens nuværende lager
    const { data: inventory } = await supabase
      .from('household_inventory')
      .select('ingredient_name, quantity, unit, category, expires_at')
      .eq('user_id', user.id)
      .eq('is_depleted', false);

    const inventoryItems = (inventory || []).map((item: any) => {
      const expiry = item.expires_at ? ` (udløber ${item.expires_at})` : '';
      return `- ${item.ingredient_name}${item.quantity ? `: ${item.quantity} ${item.unit || ''}` : ''}${expiry}`;
    }).join('\n');

    console.log('User has', inventory?.length || 0, 'items in inventory');

    // Hent aktive tilbud fra foretrukne butikker
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration_days);

    let offersQuery = supabase
      .from('offers')
      .select('id, product_name, offer_text, offer_price_dkk, original_price_dkk, valid_from, valid_until, chain_id, store_chains(name)')
      .eq('is_active', true)
      .lte('valid_from', endDate.toISOString().split('T')[0])
      .gte('valid_until', startDate.toISOString().split('T')[0])
      .order('offer_price_dkk', { ascending: true })
      .limit(100);

    if (chainIds.length > 0) {
      offersQuery = offersQuery.in('chain_id', chainIds);
    }

    const { data: offers } = await offersQuery;

    // Formater tilbud til AI prompt
    const formattedOffers = (offers || []).map((offer: any) => {
      const savings = offer.original_price_dkk && offer.offer_price_dkk 
        ? `(spar ${(offer.original_price_dkk - offer.offer_price_dkk).toFixed(0)} kr)` 
        : '';
      const storeName = offer.store_chains?.name || 'Ukendt butik';
      const validPeriod = `${offer.valid_from} til ${offer.valid_until}`;
      return `- ${offer.offer_text || offer.product_name}: ${offer.offer_price_dkk} kr ${savings} @ ${storeName} (gyldig ${validPeriod})`;
    }).join('\n');

    // Hent eksisterende opskrifter som inspiration
    const { data: existingRecipes } = await supabase
      .from('recipes')
      .select('title, ingredients, calories, protein, carbs, fat')
      .limit(20);

    const recipeExamples = (existingRecipes || []).map((r: any) => 
      `- ${r.title} (${r.calories} kcal, ${r.protein}g protein)`
    ).join('\n');

    // Byg AI prompt
    const systemPrompt = `Du er en erfaren dansk madplanlægger og kok. Du laver sunde, budgetvenlige madplaner for danske familier.

VIGTIGE REGLER:
1. PRIORITER ingredienser der er på tilbud - det er hele pointen!
2. BRUG ingredienser fra brugerens lager først - undgå at foreslå køb af ting de allerede har
3. Lav varierede retter - ikke den samme type mad hver dag
4. Tænk på holdbarhed - brug friske varer først i ugen, og ingredienser der snart udløber
5. Giv realistiske portionsstørrelser
6. Alle retter skal være nemme at lave på hverdage (max 45 min)
7. Brug danske ingredienser og opskrifter

OUTPUT FORMAT:
Returner PRÆCIS dette JSON format (ingen markdown, ingen ekstra tekst):
{
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": {
        "title": "string",
        "description": "string",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "prep_time": number,
        "ingredients": [{"name": "string", "amount": "string", "unit": "string"}],
        "instructions": ["string"],
        "uses_offers": [{"offer_text": "string", "store": "string", "savings": number}]
      },
      "lunch": { ... samme format ... },
      "dinner": { ... samme format ... }
    }
  ],
  "total_estimated_savings": number,
  "shopping_summary": {
    "by_store": [
      {"store": "string", "items": ["string"], "estimated_cost": number}
    ]
  }
}`;

    const userPrompt = `Lav en ${duration_days}-dages madplan startende ${startDate.toISOString().split('T')[0]}.

BRUGERINFO:
- Dagligt kaloriemål: ${profile?.daily_calories || 2000} kcal
- Protein mål: ${profile?.daily_protein_target || 75}g
- Kulhydrat mål: ${profile?.daily_carbs_target || 250}g
- Fedt mål: ${profile?.daily_fat_target || 65}g
- Antal personer: ${profile?.people_count || 1}
- Allergener at undgå: ${allergenNames.length > 0 ? allergenNames.join(', ') : 'Ingen'}
- Foretrukne butikker: ${chainNames.length > 0 ? chainNames.join(', ') : 'Alle'}

AKTUELLE TILBUD (BRUG DISSE!):
${formattedOffers || 'Ingen tilbud fundet'}

BRUGERENS NUVÆRENDE LAGER (BRUG DISSE FØRST!):
${inventoryItems || 'Ingen varer i lageret'}

EKSEMPLER PÅ GODE OPSKRIFTER:
${recipeExamples || 'Ingen eksempler'}

Lav madplanen nu. Husk at bruge ingredienser fra lageret og tilbuddene aktivt, og beregn besparelser!`;

    console.log('Generating meal plan with', offers?.length || 0, 'offers');

    // Kald OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content from AI');
    }

    console.log('AI response received, parsing...');

    // Parse JSON fra AI response
    let mealPlanData;
    try {
      // Fjern eventuelle markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      mealPlanData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse meal plan from AI');
    }

    // Gem madplanen i databasen
    const { data: savedPlan, error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: `Madplan ${startDate.toLocaleDateString('da-DK')}`,
        duration_days,
        meals: mealPlanData.meals,
        total_cost: mealPlanData.shopping_summary?.by_store?.reduce((sum: number, store: any) => sum + (store.estimated_cost || 0), 0) || null,
        total_savings: mealPlanData.total_estimated_savings || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save meal plan:', saveError);
      throw new Error('Failed to save meal plan');
    }

    console.log('Meal plan saved:', savedPlan.id);

    return new Response(JSON.stringify({
      success: true,
      meal_plan: savedPlan,
      shopping_summary: mealPlanData.shopping_summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meal-plan:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
