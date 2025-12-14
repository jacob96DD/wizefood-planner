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

interface FixedMeal {
  day: string;
  meal: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealException {
  day: string;
  meal: string;
  type: string;
  description?: string;
}

interface ExtraCalories {
  description: string;
  calories_per_week: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlanPreferences {
  cooking_style: string;
  skip_breakfast: boolean;
  skip_lunch: boolean;
  skip_dinner: boolean;
  fixed_meals: FixedMeal[];
  exceptions: MealException[];
  extra_calories: ExtraCalories[];
  weekday_max_cook_time: number;
  weekend_max_cook_time: number;
  generate_alternatives: number;
  max_weekly_budget?: number;
}

// Get current season based on month
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'forår';
  if (month >= 5 && month <= 7) return 'sommer';
  if (month >= 8 && month <= 10) return 'efterår';
  return 'vinter';
}

function getSeasonalIngredients(season: string): string[] {
  const seasonal: Record<string, string[]> = {
    forår: ['asparges', 'radiser', 'spinat', 'ramsløg', 'jordbær', 'rabarber'],
    sommer: ['tomater', 'agurk', 'squash', 'bønner', 'bær', 'majs', 'salat'],
    efterår: ['græskar', 'svampe', 'æbler', 'pærer', 'kål', 'rødbeder'],
    vinter: ['rodfrugter', 'grønkål', 'porrer', 'selleri', 'gulerødder', 'kartofler', 'løg'],
  };
  return seasonal[season] || seasonal.vinter;
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    // ============ FETCH ALL DATA IN PARALLEL ============
    const [
      profileResult,
      preferencesResult,
      allergensResult,
      preferredChainsResult,
      inventoryResult,
      ingredientPrefsResult,
      swipesResult,
      recentMealsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_plan_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_allergens').select('allergen_id, allergens(name)').eq('user_id', user.id),
      supabase.from('user_preferred_chains').select('chain_id, store_chains(name)').eq('user_id', user.id),
      supabase.from('household_inventory').select('ingredient_name, quantity, unit, category, expires_at').eq('user_id', user.id).eq('is_depleted', false),
      supabase.from('ingredient_preferences').select('ingredient_name, preference').eq('user_id', user.id),
      supabase.from('swipes').select('recipe_id, direction, recipes(title, ingredients)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('meal_plans').select('meals, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
    ]);

    const profile = profileResult.data;
    const prefs: MealPlanPreferences = preferencesResult.data || {
      cooking_style: 'daily',
      skip_breakfast: false,
      skip_lunch: false,
      skip_dinner: false,
      fixed_meals: [],
      exceptions: [],
      extra_calories: [],
      weekday_max_cook_time: 30,
      weekend_max_cook_time: 60,
      generate_alternatives: 0,
    };

    // ============ PRIORITY 1: CRITICAL ============

    // 1.1 Allergens (NEVER use these)
    const allergenNames = (allergensResult.data || [])
      .map((ua: any) => ua.allergens?.name)
      .filter(Boolean);

    // 1.2 Hard dislikes (from ingredient_preferences + "never" swipes)
    const hardDislikes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'dislike' || p.preference === 'never')
      .map((p: any) => p.ingredient_name);

    // Add ingredients from "never" swipes
    const neverSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'down')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    const allDislikes = [...new Set([...hardDislikes, ...neverSwipes])];

    // 1.3 Calculate adjusted macros
    const baseCalories = profile?.daily_calories || 2000;
    const baseProtein = profile?.daily_protein_target || 75;
    const baseCarbs = profile?.daily_carbs_target || 250;
    const baseFat = profile?.daily_fat_target || 65;

    // Subtract extra calories (weekly / 7)
    const extraCaloriesPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.calories_per_week / 7), 0
    );
    const extraProteinPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.protein / 7), 0
    );

    // Subtract fixed meals
    const fixedCaloriesPerDay = (prefs.fixed_meals || []).reduce((sum: number, meal: FixedMeal) => {
      if (meal.day === 'all') return sum + meal.calories;
      return sum + (meal.calories / 7);
    }, 0);
    const fixedProteinPerDay = (prefs.fixed_meals || []).reduce((sum: number, meal: FixedMeal) => {
      if (meal.day === 'all') return sum + meal.protein;
      return sum + (meal.protein / 7);
    }, 0);

    const availableCalories = Math.round(baseCalories - extraCaloriesPerDay - fixedCaloriesPerDay);
    const availableProtein = Math.round(baseProtein - extraProteinPerDay - fixedProteinPerDay);

    // 1.4 Meal structure
    const mealsToInclude: string[] = [];
    if (!prefs.skip_breakfast) mealsToInclude.push('breakfast');
    if (!prefs.skip_lunch) mealsToInclude.push('lunch');
    if (!prefs.skip_dinner) mealsToInclude.push('dinner');

    const mealPrepDescription = {
      'daily': 'lav en ny ret hver dag',
      'meal_prep_2': 'lav 2 retter der gentages hele ugen',
      'meal_prep_3': 'lav 3-4 retter der gentages hele ugen',
      'meal_prep_4': 'lav 4+ retter der gentages hele ugen',
    }[prefs.cooking_style] || 'lav en ny ret hver dag';

    // ============ PRIORITY 2: IMPORTANT ============

    // 2.1 Current offers
    const chainIds = (preferredChainsResult.data || []).map((pc: any) => pc.chain_id);
    const chainNames = (preferredChainsResult.data || []).map((pc: any) => pc.store_chains?.name).filter(Boolean);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration_days);

    let offersQuery = supabase
      .from('offers')
      .select('id, product_name, offer_text, offer_price_dkk, original_price_dkk, valid_from, valid_until, chain_id, store_chains(name)')
      .eq('is_active', true)
      .lte('valid_from', endDate.toISOString().split('T')[0])
      .gte('valid_until', startDate.toISOString().split('T')[0])
      .order('offer_price_dkk', { ascending: true })
      .limit(50);

    if (chainIds.length > 0) {
      offersQuery = offersQuery.in('chain_id', chainIds);
    }

    const { data: offers } = await offersQuery;

    const formattedOffers = (offers || []).slice(0, 20).map((offer: any) => {
      const savings = offer.original_price_dkk && offer.offer_price_dkk 
        ? `(spar ${(offer.original_price_dkk - offer.offer_price_dkk).toFixed(0)} kr)` 
        : '';
      const storeName = offer.store_chains?.name || 'Ukendt butik';
      return `- ${offer.offer_text || offer.product_name}: ${offer.offer_price_dkk} kr ${savings} @ ${storeName}`;
    }).join('\n');

    // 2.2 Budget - prioritize preferences, fallback to profile
    const weeklyBudget = prefs.max_weekly_budget || profile?.budget_per_week || 800;

    // 2.3 Positive preferences (from likes)
    const likes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'like')
      .map((p: any) => p.ingredient_name);

    // Add ingredients from "yes" and "super" swipes
    const positiveSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    const allLikes = [...new Set([...likes, ...positiveSwipes])].slice(0, 20);

    // 2.4 Season & seasonal ingredients
    const season = getCurrentSeason();
    const seasonalIngredients = getSeasonalIngredients(season);

    // ============ PRIORITY 3: NICE-TO-HAVE ============

    // 3.1 Cooking time (included in prefs)
    const weekdayMaxTime = prefs.weekday_max_cook_time || 30;
    const weekendMaxTime = prefs.weekend_max_cook_time || 60;

    // 3.3 Inventory
    const inventory = inventoryResult.data || [];
    const inventoryItems = inventory.map((item: any) => {
      const expiry = item.expires_at ? ` (udløber ${item.expires_at})` : '';
      return `- ${item.ingredient_name}${item.quantity ? `: ${item.quantity} ${item.unit || ''}` : ''}${expiry}`;
    }).join('\n');

    // 3.5 Recent meals (avoid repetition)
    const recentMealTitles: string[] = [];
    (recentMealsResult.data || []).forEach((plan: any) => {
      if (Array.isArray(plan.meals)) {
        plan.meals.forEach((day: any) => {
          if (day.breakfast?.title) recentMealTitles.push(day.breakfast.title);
          if (day.lunch?.title) recentMealTitles.push(day.lunch.title);
          if (day.dinner?.title) recentMealTitles.push(day.dinner.title);
        });
      }
    });

    // ============ PRIORITY 4: CONTEXT ============

    // 4.2 Swipe patterns (aggregated)
    const likedRecipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .map((s: any) => s.recipes?.title)
      .filter(Boolean)
      .slice(0, 10);

    // 4.3 Dietary goal
    const dietaryGoal = profile?.dietary_goal || 'maintain';

    // ============ OVERGENERATION for swipe selection ============
    const alternativesMultiplier = Math.max(1, (prefs.generate_alternatives || 0) + 1);
    const recipesPerMealType = duration_days * alternativesMultiplier;

    // ============ BUILD PRIORITIZED AI PROMPT ============

    const fixedMealsDescription = (prefs.fixed_meals || []).length > 0
      ? (prefs.fixed_meals || []).map((m: FixedMeal) => 
          `${m.day === 'all' ? 'Hver dag' : m.day} ${m.meal}: "${m.description}" (${m.calories} kcal)`
        ).join('\n')
      : 'Ingen';

    const exceptionsDescription = (prefs.exceptions || []).length > 0
      ? (prefs.exceptions || []).map((e: MealException) => 
          `${e.day} ${e.meal}: ${e.type}${e.description ? ` (${e.description})` : ''}`
        ).join('\n')
      : 'Ingen';

    const extraCaloriesDescription = (prefs.extra_calories || []).length > 0
      ? (prefs.extra_calories || []).map((e: ExtraCalories) => 
          `${e.description}: ${e.calories_per_week} kcal/uge`
        ).join('\n')
      : 'Ingen';

    const systemPrompt = `Du er en erfaren dansk madplanlægger og kok. Du laver sunde, budgetvenlige madplaner for danske familier.

🔴 KRITISKE REGLER (UFRAVIGELIGE):
1. ALDRIG brug disse ingredienser (allergener): ${allergenNames.length > 0 ? allergenNames.join(', ') : 'Ingen allergener'}
2. ALDRIG foreslå disse ingredienser (bruger hader): ${allDislikes.length > 0 ? allDislikes.slice(0, 15).join(', ') : 'Ingen'}
3. Hver ret skal ramme ca. ${Math.round(availableCalories / mealsToInclude.length)} kcal (total dag: ${availableCalories} kcal)
4. Protein per dag: ${availableProtein}g (±10%)
5. Måltider: ${mealsToInclude.length > 0 ? mealsToInclude.join(', ') : 'alle'}
6. Madlavningsstil: ${mealPrepDescription}
7. Faste måltider (medregnet allerede):
${fixedMealsDescription}
8. Undtagelser (spring over):
${exceptionsDescription}

🟠 VIGTIGE PRIORITETER:
1. PRIORITER disse tilbud aktivt:
${formattedOffers || 'Ingen tilbud fundet'}
2. Max ugentligt budget: ${weeklyBudget} kr
3. Inkluder flere af disse ingredienser (bruger elsker): ${allLikes.length > 0 ? allLikes.join(', ') : 'Ingen præferencer'}
4. Brug sæsonvarer (${season}): ${seasonalIngredients.join(', ')}

🟡 NICE-TO-HAVE:
1. Hverdage max ${weekdayMaxTime} min tilberedning, weekend max ${weekendMaxTime} min
2. Brug fra lager først:
${inventoryItems || 'Ingen varer i lageret'}
3. Undgå disse retter fra sidste 2 uger: ${recentMealTitles.length > 0 ? recentMealTitles.slice(0, 10).join(', ') : 'Ingen'}

🟢 KONTEKST:
1. Brugerens favoritretter: ${likedRecipes.length > 0 ? likedRecipes.join(', ') : 'Ingen data'}
2. Ernæringsmål: ${dietaryGoal === 'lose' ? 'vægttab' : dietaryGoal === 'gain' ? 'muskelopbygning' : 'vedligehold'}
3. Antal personer: ${profile?.people_count || 1}

📊 OVERGENERATION:
Generér ${recipesPerMealType} unikke retter PER måltidstype for at give brugeren valgmuligheder.
${alternativesMultiplier > 1 ? `Brugeren vil swipe og vælge ${duration_days} retter per måltidstype.` : ''}

OUTPUT FORMAT:
Returner PRÆCIS dette JSON format (ingen markdown, ingen ekstra tekst):
{
  "recipe_options": {
    "breakfast": ${prefs.skip_breakfast ? '[]' : `[/* ${recipesPerMealType} morgenmads-retter */]`},
    "lunch": ${prefs.skip_lunch ? '[]' : `[/* ${recipesPerMealType} frokost-retter */]`},
    "dinner": ${prefs.skip_dinner ? '[]' : `[/* ${recipesPerMealType} aftensmads-retter */]`}
  },
  "total_estimated_savings": number,
  "shopping_summary": {
    "by_store": [
      {"store": "string", "items": ["string"], "estimated_cost": number}
    ]
  }
}

Hver ret skal have dette format:
{
  "id": "unique-id",
  "title": "string",
  "description": "kort beskrivelse (max 50 ord)",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "prep_time": number,
  "cook_time": number,
  "servings": ${profile?.people_count || 1},
  "ingredients": [{"name": "string", "amount": "string", "unit": "string"}],
  "instructions": ["trin 1", "trin 2", ...],
  "tags": ["hurtig", "meal-prep", "høj-protein", etc.],
  "uses_offers": [{"offer_text": "string", "store": "string", "savings": number}],
  "uses_inventory": ["ingredient_name"],
  "estimated_price": number
}`;

    const userPrompt = `Lav ${recipesPerMealType} unikke retter per måltidstype (total ${recipesPerMealType * mealsToInclude.length} retter) for en ${duration_days}-dages madplan startende ${startDate.toISOString().split('T')[0]}.

Husk:
- Prioriter tilbud og lager aktivt
- Hver ret skal ramme ~${Math.round(availableCalories / mealsToInclude.length)} kcal
- ${mealPrepDescription}
- Beregn besparelser fra tilbud
- Giv unikke, varierede forslag så brugeren kan vælge

Lav retterne nu!`;

    console.log('Generating meal plan with Claude Sonnet 4:', {
      cooking_style: prefs.cooking_style,
      meals: mealsToInclude,
      availableCalories,
      recipesPerMealType,
      alternativesMultiplier,
      offers: offers?.length || 0,
      inventory: inventory.length,
      allergens: allergenNames.length,
      dislikes: allDislikes.length,
    });

    // Call Claude Sonnet 4 via Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
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
          error: 'AI credits opbrugt. Tilføj flere credits i Lovable indstillinger.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content from AI');
    }

    console.log('AI response received, parsing...');

    // Parse JSON from AI response
    let mealPlanData;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      mealPlanData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse meal plan from AI');
    }

    // Convert recipe_options to meals array format for backwards compatibility
    const recipeOptions = mealPlanData.recipe_options || {};
    const allRecipes = {
      breakfast: recipeOptions.breakfast || [],
      lunch: recipeOptions.lunch || [],
      dinner: recipeOptions.dinner || [],
    };

    // If no alternatives requested, create traditional meal plan structure
    let mealsArray: any[] = [];
    if (alternativesMultiplier === 1) {
      // Create 7-day meal plan from first recipe of each type
      for (let i = 0; i < duration_days; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        
        mealsArray.push({
          date: dayDate.toISOString().split('T')[0],
          breakfast: allRecipes.breakfast[i % allRecipes.breakfast.length] || null,
          lunch: allRecipes.lunch[i % allRecipes.lunch.length] || null,
          dinner: allRecipes.dinner[i % allRecipes.dinner.length] || null,
        });
      }
    }

    // Save meal plan to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: `Madplan ${startDate.toLocaleDateString('da-DK')}`,
        duration_days,
        meals: alternativesMultiplier > 1 ? allRecipes : mealsArray,
        total_cost: mealPlanData.shopping_summary?.by_store?.reduce((sum: number, store: any) => sum + (store.estimated_cost || 0), 0) || null,
        total_savings: mealPlanData.total_estimated_savings || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save meal plan:', saveError);
      throw new Error('Failed to save meal plan');
    }

    console.log('Meal plan saved:', savedPlan.id, 'with', alternativesMultiplier > 1 ? 'recipe options' : 'meal schedule');

    return new Response(JSON.stringify({
      success: true,
      meal_plan: savedPlan,
      recipe_options: alternativesMultiplier > 1 ? allRecipes : null,
      shopping_summary: mealPlanData.shopping_summary,
      has_alternatives: alternativesMultiplier > 1,
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
