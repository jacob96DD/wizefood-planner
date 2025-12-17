import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealPlanRequest {
  duration_days: number;
  start_date: string;
  custom_request?: string;
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
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { duration_days = 7, start_date, custom_request } = await req.json() as MealPlanRequest;
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
      discoverSwipesResult,
      mealPlanSwipesResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_plan_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_allergens').select('allergen_id, allergens(name)').eq('user_id', user.id),
      supabase.from('user_preferred_chains').select('chain_id, store_chains(name)').eq('user_id', user.id),
      supabase.from('household_inventory').select('ingredient_name, quantity, unit, category, expires_at').eq('user_id', user.id).eq('is_depleted', false),
      supabase.from('ingredient_preferences').select('ingredient_name, preference').eq('user_id', user.id),
      supabase.from('swipes').select('recipe_id, direction, rating, recipes(title, ingredients)').eq('user_id', user.id).not('recipe_id', 'is', null).order('created_at', { ascending: false }).limit(100),
      supabase.from('meal_plans').select('meals, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      // Hent discover swipes med ratings
      supabase.from('swipes').select('discover_recipe_id, direction, rating, discover_recipes(title, key_ingredients)').eq('user_id', user.id).not('discover_recipe_id', 'is', null),
      // Hent meal plan swipes (AI-genererede retter)
      supabase.from('swipes').select('rating, meal_plan_recipe_title, meal_plan_key_ingredients').eq('user_id', user.id).not('meal_plan_recipe_title', 'is', null),
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

    // 1.2 Process discover ratings for preferences
    const discoverSwipes = discoverSwipesResult.data || [];
    
    // LIVRETTER (love) - ingredienser brugeren ELSKER
    const lovedDishes = discoverSwipes.filter((s: any) => s.rating === 'love');
    const lovedIngredients = [...new Set(lovedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    const lovedDishNames = lovedDishes.map((s: any) => s.discover_recipes?.title).filter(Boolean);
    
    // Gode retter (like) - brugeren kan lide disse
    const likedDishes = discoverSwipes.filter((s: any) => s.rating === 'like');
    const likedIngredients = [...new Set(likedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    
    // Ikke fan (dislike) - undgå helst disse
    const dislikedDishes = discoverSwipes.filter((s: any) => s.rating === 'dislike');
    const dislikedIngredients = [...new Set(dislikedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    
    // HADER (hate) - ALDRIG brug disse ingredienser
    const hatedDishes = discoverSwipes.filter((s: any) => s.rating === 'hate');
    const hatedIngredients = [...new Set(hatedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    const hatedDishNames = hatedDishes.map((s: any) => s.discover_recipes?.title).filter(Boolean);

    // 1.3 Process meal plan swipes (AI-genererede retter fra tidligere)
    const mealPlanSwipes = mealPlanSwipesResult.data || [];
    const mpLovedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'love')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpLikedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'like')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpHatedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'hate')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpDislikedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'dislike')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);

    // 1.4 Hard dislikes (from ingredient_preferences + "never" swipes + hated discover dishes + meal plan hates)
    const hardDislikes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'dislike' || p.preference === 'never')
      .map((p: any) => p.ingredient_name);

    const neverSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'down' || s.rating === 'hate')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    
    // Kombiner alle hårde dislikes
    const allDislikes = [...new Set([...hardDislikes, ...neverSwipes, ...hatedIngredients, ...mpHatedIngredients])];
    
    // Kombiner alle likes
    const allLovedIngredients = [...new Set([...lovedIngredients, ...mpLovedIngredients])];
    const allLikedIngredients = [...new Set([...likedIngredients, ...mpLikedIngredients])];

    // 1.5 Calculate adjusted macros
    const baseCalories = profile?.daily_calories || 2000;
    const baseProtein = profile?.daily_protein_target || 75;
    const baseCarbs = profile?.daily_carbs_target || 250;
    const baseFat = profile?.daily_fat_target || 65;

    const extraCaloriesPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.calories_per_week / 7), 0
    );
    const extraProteinPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.protein / 7), 0
    );

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

    // 1.6 Meal structure - only for calorie calculation
    const mealsToInclude: string[] = [];
    if (!prefs.skip_breakfast) mealsToInclude.push('breakfast');
    if (!prefs.skip_lunch) mealsToInclude.push('lunch');
    if (!prefs.skip_dinner) mealsToInclude.push('dinner');
    const mealsPerDay = mealsToInclude.length || 3;

    // ============ CALCULATE TOTAL RECIPES TO GENERATE ============
    // NY LOGIK: Generer (needed + 3) retter TOTAL i én samlet liste
    const getRecipesToGenerate = (): { needed: number; total: number } => {
      switch (prefs.cooking_style) {
        case 'meal_prep_2': return { needed: 2, total: 5 };  // 2 + 3
        case 'meal_prep_3': return { needed: 3, total: 6 };  // 3 + 3
        case 'meal_prep_4': return { needed: 4, total: 7 };  // 4 + 3
        case 'daily':
        default:
          return { needed: duration_days, total: duration_days + 3 }; // 7 + 3 = 10
      }
    };
    const { needed: recipesNeeded, total: recipesToGenerate } = getRecipesToGenerate();
    
    // Custom request sektion
    const customRequestSection = custom_request && custom_request.trim() 
      ? `
🎯 BRUGERENS SPECIFIKKE ØNSKE (HØJESTE PRIORITET):
"${custom_request}"
⚠️ UFRAVIGELIGT: Dette ønske har ABSOLUT HØJESTE prioritet og SKAL respekteres!`
      : '';

    // ============ PRIORITY 2: IMPORTANT ============

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

    // 🔴 KATEGORISER PROTEIN-TILBUD FØRST (for tilbuds-baseret opskriftsgenerering)
    const proteinKeywords = ['kylling', 'okse', 'svine', 'laks', 'torsk', 'hakket', 'bøf', 'filet', 'kød', 'rejer', 'flæsk', 'bacon', 'medister'];
    const proteinOffers = (offers || []).filter((o: any) => {
      const text = ((o.offer_text || '') + ' ' + (o.product_name || '')).toLowerCase();
      return proteinKeywords.some(kw => text.includes(kw));
    });

    const proteinOffersSection = proteinOffers.length > 0 ? `
🔴 PROTEIN PÅ TILBUD DENNE UGE (BYGG OPSKRIFTER RUNDT OM DISSE!):
${proteinOffers.slice(0, 8).map((o: any) => {
  const savings = o.original_price_dkk && o.offer_price_dkk 
    ? `(spar ${(o.original_price_dkk - o.offer_price_dkk).toFixed(0)} kr)` 
    : '';
  const storeName = o.store_chains?.name || 'Ukendt butik';
  return `- ${o.offer_text || o.product_name}: ${o.offer_price_dkk} kr ${savings} @ ${storeName}`;
}).join('\n')}

⚡ DIN OPGAVE:
1. Vælg 2-3 af disse protein-tilbud som BASE for opskrifterne
2. Design opskrifter der BRUGER tilbuds-protein som hovedingrediens
3. Justér portion-størrelse for at ramme protein-target (${availableProtein}g/dag)
4. Beregn besparelser baseret på tilbudspris vs. normalpris
` : '';

    const formattedOffers = (offers || []).slice(0, 20).map((offer: any) => {
      const savings = offer.original_price_dkk && offer.offer_price_dkk 
        ? `(spar ${(offer.original_price_dkk - offer.offer_price_dkk).toFixed(0)} kr)` 
        : '';
      const storeName = offer.store_chains?.name || 'Ukendt butik';
      return `- ${offer.offer_text || offer.product_name}: ${offer.offer_price_dkk} kr ${savings} @ ${storeName}`;
    }).join('\n');

    const weeklyBudget = prefs.max_weekly_budget || profile?.budget_per_week || 800;

    const likes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'like')
      .map((p: any) => p.ingredient_name);

    const positiveSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    const allLikes = [...new Set([...likes, ...positiveSwipes, ...allLovedIngredients, ...allLikedIngredients])].slice(0, 20);

    const season = getCurrentSeason();
    const seasonalIngredients = getSeasonalIngredients(season);

    // ============ PRIORITY 3: NICE-TO-HAVE ============
    const weekdayMaxTime = prefs.weekday_max_cook_time || 30;
    const weekendMaxTime = prefs.weekend_max_cook_time || 60;

    const inventory = inventoryResult.data || [];
    const inventoryItems = inventory.map((item: any) => {
      const expiry = item.expires_at ? ` (udløber ${item.expires_at})` : '';
      return `- ${item.ingredient_name}${item.quantity ? `: ${item.quantity} ${item.unit || ''}` : ''}${expiry}`;
    }).join('\n');

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
    const likedRecipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .map((s: any) => s.recipes?.title)
      .filter(Boolean)
      .slice(0, 10);

    const dietaryGoal = profile?.dietary_goal || 'maintain';
    const prioritizeBudget = dietaryGoal === 'maintain' || (weeklyBudget && weeklyBudget < 600);

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

    const inventorySection = prioritizeBudget && inventory.length > 0
      ? `
🔴 KRITISK - BRUG LAGER-INGREDIENSER FØRST (bruger har dem = GRATIS):
${inventoryItems}
⚠️ UFRAVIGELIGT: Retter der bruger ingredienser fra lageret SKAL prioriteres højest!`
      : `
🟡 Brug fra lager hvis det passer:
${inventoryItems || 'Ingen varer i lageret'}`;

    const focusSection = prioritizeBudget
      ? `
🔴 KRITISK - BUDGET-FOKUS:
- HOLD max ugentligt budget: ${weeklyBudget} kr
- Prioriter BILLIGE ingredienser og tilbud`
      : `
🔴 KRITISK - SUNDHEDS-FOKUS:
- Ernæringsmål: ${dietaryGoal === 'lose' ? 'VÆGTTAB' : dietaryGoal === 'gain' ? 'MUSKELOPBYGNING' : 'vedligehold'}
- Fokuser på NÆRINGSINDHOLD og makrobalance`;

    const discoverPreferencesSection = allLovedIngredients.length > 0 || allDislikes.length > 0 ? `

🔥 BRUGERENS SMAGSPROFIL (fra tidligere swipes):
${lovedDishNames.length > 0 ? `LIVRETTER: ${lovedDishNames.slice(0, 5).join(', ')}` : ''}
${allLovedIngredients.length > 0 ? `Elskede ingredienser (brug OFTE): ${allLovedIngredients.slice(0, 15).join(', ')}` : ''}
${allLikedIngredients.length > 0 ? `Kan godt lide: ${allLikedIngredients.slice(0, 10).join(', ')}` : ''}
${[...dislikedIngredients, ...mpDislikedIngredients].length > 0 ? `Undgå helst: ${[...new Set([...dislikedIngredients, ...mpDislikedIngredients])].slice(0, 10).join(', ')}` : ''}
${hatedDishNames.length > 0 ? `🤮 HADER (ALDRIG lignende!): ${hatedDishNames.slice(0, 5).join(', ')}` : ''}` : '';

    // NY PROMPT: Én samlet liste af retter
    const cookingStyleDescription = prefs.cooking_style === 'daily' 
      ? `DAGLIG MADLAVNING: ${recipesNeeded} forskellige retter (én ny ret hver dag)`
      : `MEAL PREP: ${recipesNeeded} retter der skal genbruges hele ugen (laves i store portioner)`;

    // 🍽️ VALDEMARSRO-STIL: Danske hverdagsretter med konkrete mængder
    const valdemarsroStyle = `
🍽️ OPSKRIFT-STIL (Valdemarsro-inspireret dansk hverdagsmad):
- Enkle ingredienslister (max 10-12 ingredienser)
- KONKRETE mængder på ALT - aldrig "salt og peber efter smag"
- Trin-for-trin instruktioner med tilberednings-tips
- Realistiske danske portioner:
  • Kød: 120-180g per person (ikke 300g!)
  • Grøntsager: 150-200g per person
  • Pasta/ris: 75-100g tør vægt per person

❌ ALDRIG skriv:
- "Tilsæt salt og peber efter smag"
- "Pynt med friske urter"
- Vage mængder som "lidt", "efter behov", "ca."

✅ I STEDET skriv:
- "1 tsk salt" / "½ tsk sort peber"
- "2 spsk frisk persille, finthakket"
- "150g kyllingebryst per person"
- "75g spaghetti (tør vægt) per person"
- Konkrete gram, dl, spsk, tsk, stk

📝 INSTRUKTIONER:
- Undgå generiske trin som "Tilsæt krydderier"
- Skriv specifikt: "Tilsæt 1 tsk paprika og ½ tsk spidskommen"
- Inkluder tilberednings-tips: "Sautér løgene i 5-7 min til de er gyldne"
`;

    const systemPrompt = `Du er en erfaren dansk madplanlægger inspireret af Valdemarsro.dk.
${customRequestSection}
${discoverPreferencesSection}

${valdemarsroStyle}

🔴 KRITISKE REGLER (UFRAVIGELIGE):
1. ALDRIG brug disse ingredienser (allergener): ${allergenNames.length > 0 ? allergenNames.join(', ') : 'Ingen'}
2. ALDRIG foreslå disse (bruger hader): ${allDislikes.length > 0 ? allDislikes.slice(0, 15).join(', ') : 'Ingen'}
3. Hver ret skal ramme ca. ${Math.round(availableCalories / mealsPerDay)} kcal
4. Protein per ret: ~${Math.round(availableProtein / mealsPerDay)}g

📋 MADLAVNINGSSTIL:
${cookingStyleDescription}

${proteinOffersSection}
${inventorySection}
${focusSection}

🟠 ANDRE TILBUD (brug hvis de passer):
${formattedOffers || 'Ingen tilbud'}

⚡ MAKRO-OPTIMERING VIA TILBUD:
- Hvis KØD er på tilbud: ØGET kødmængde i retten (f.eks. 120g → 180g)
- Tilpas andre ingredienser NED så totale kalorier stadig passer
- F.eks: Mere kylling = mindre ris/pasta
- Prioritér protein fra tilbudsvarer for at ramme protein-target billigst

🟡 ANDRE PRIORITETER:
1. Inkluder disse ingredienser (bruger elsker): ${allLikes.slice(0, 15).join(', ') || 'Ingen præferencer'}
2. Brug sæsonvarer (${season}): ${seasonalIngredients.join(', ')}
3. Max ${weekdayMaxTime}-${weekendMaxTime} min tilberedning
4. Undgå disse retter fra nyligt: ${recentMealTitles.length > 0 ? recentMealTitles.slice(0, 8).join(', ') : 'Ingen'}

📊 GENERERING:
Generér PRÆCIS ${recipesToGenerate} UNIKKE retter i ÉN samlet liste.
Brugeren skal vælge ${recipesNeeded} af dem (swiper ja/nej).
Giv varierede forslag: forskellige proteiner, tilberedningsmetoder, cuisines.

OUTPUT FORMAT (KUN JSON, ingen markdown):
{
  "recipes": [
    {
      "id": "unique-id-1",
      "title": "string",
      "description": "kort beskrivelse (max 50 ord)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "prep_time": number,
      "cook_time": number,
      "servings": ${profile?.people_count || 1},
      "ingredients": [{"name": "string", "amount": "string med konkret tal", "unit": "string"}],
      "instructions": ["trin 1 med konkrete mængder og tider", "trin 2"],
      "tags": ["hurtig", "meal-prep", "høj-protein"],
      "key_ingredients": ["hovedingrediens1", "hovedingrediens2"],
      "uses_offers": [{"offer_text": "string", "store": "string", "savings": number}],
      "uses_inventory": ["ingredient_name"],
      "estimated_price": number
    }
  ],
  "total_estimated_savings": number
}`;

    const userPrompt = `Lav ${recipesToGenerate} unikke retter til en ${duration_days}-dages madplan.

Husk:
- ${recipesNeeded} retter skal vælges af brugeren
- Giv ${recipesToGenerate - recipesNeeded} ekstra alternativer
- Varier proteiner og tilberedningsmetoder
- Beregn besparelser fra tilbud

Lav retterne nu!`;

    console.log('Generating meal plan with Claude Sonnet 4:', {
      cooking_style: prefs.cooking_style,
      recipesNeeded,
      recipesToGenerate,
      availableCalories,
      offers: offers?.length || 0,
      inventory: inventory.length,
      allergens: allergenNames.length,
      dislikes: allDislikes.length,
      lovedIngredients: allLovedIngredients.length,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit nået. Prøv igen om lidt.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      throw new Error('No content from AI');
    }

    console.log('AI response received, parsing...');

    let mealPlanData;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      mealPlanData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse meal plan from AI');
    }

    // NY STRUKTUR: Returner én samlet liste af retter
    const recipes = mealPlanData.recipes || [];
    
    console.log(`Generated ${recipes.length} recipes for swipe selection`);

    return new Response(JSON.stringify({
      success: true,
      recipes: recipes,  // Én samlet liste
      recipes_needed: recipesNeeded,  // Hvor mange brugeren skal vælge
      macro_targets: {
        calories: availableCalories,
        protein: availableProtein,
        carbs: baseCarbs,
        fat: baseFat,
      },
      total_estimated_savings: mealPlanData.total_estimated_savings || 0,
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
