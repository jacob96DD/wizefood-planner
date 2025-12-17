import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ MAKRO-DATABASE (per 100g rå vægt) ============
const MACRO_DB: Record<string, { kcal: number; p: number; c: number; f: number }> = {
  // Kulhydrater
  'pasta': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'spaghetti': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'penne': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'fettuccine': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'fusilli': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'tagliatelle': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'ris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'jasminris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'basmatiris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'kartofler': { kcal: 77, p: 2, c: 17, f: 0.1 },
  'kartoffel': { kcal: 77, p: 2, c: 17, f: 0.1 },
  'brød': { kcal: 250, p: 9, c: 49, f: 2 },
  'bulgur': { kcal: 340, p: 12, c: 69, f: 1.5 },
  'couscous': { kcal: 360, p: 13, c: 73, f: 1.5 },
  'nudler': { kcal: 360, p: 12, c: 72, f: 2 },
  
  // Kød
  'kyllingebryst': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'kylling': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'kyllingelår': { kcal: 210, p: 26, c: 0, f: 12 },
  'hakket oksekød': { kcal: 220, p: 26, c: 0, f: 14 },
  'hakket okse': { kcal: 220, p: 26, c: 0, f: 14 },
  'oksekød': { kcal: 220, p: 26, c: 0, f: 14 },
  'hakket svinekød': { kcal: 260, p: 24, c: 0, f: 18 },
  'svinekød': { kcal: 250, p: 20, c: 0, f: 19 },
  'flæskesteg': { kcal: 250, p: 20, c: 0, f: 19 },
  'flæsk': { kcal: 250, p: 20, c: 0, f: 19 },
  'bacon': { kcal: 540, p: 37, c: 1, f: 42 },
  'medister': { kcal: 280, p: 14, c: 3, f: 24 },
  'bøf': { kcal: 220, p: 26, c: 0, f: 14 },
  'kalvekød': { kcal: 150, p: 21, c: 0, f: 8 },
  'lam': { kcal: 280, p: 25, c: 0, f: 20 },
  
  // Fisk og skaldyr
  'laks': { kcal: 200, p: 20, c: 0, f: 13 },
  'torsk': { kcal: 82, p: 18, c: 0, f: 0.7 },
  'rejer': { kcal: 100, p: 24, c: 0, f: 0.5 },
  'tun': { kcal: 130, p: 29, c: 0, f: 1 },
  'sej': { kcal: 80, p: 17, c: 0, f: 1 },
  'makrel': { kcal: 260, p: 24, c: 0, f: 18 },
  'rødspætte': { kcal: 90, p: 18, c: 0, f: 1.5 },
  
  // Mejeriprodukter
  'æg': { kcal: 150, p: 12, c: 1, f: 11 },
  'parmesan': { kcal: 430, p: 38, c: 4, f: 29 },
  'ost': { kcal: 350, p: 25, c: 1, f: 28 },
  'mozzarella': { kcal: 280, p: 22, c: 2, f: 22 },
  'feta': { kcal: 260, p: 14, c: 4, f: 21 },
  'flødeost': { kcal: 340, p: 6, c: 4, f: 33 },
  'creme fraiche': { kcal: 190, p: 3, c: 4, f: 18 },
  'fløde': { kcal: 340, p: 2, c: 3, f: 36 },
  'mælk': { kcal: 64, p: 3, c: 5, f: 4 },
  'yoghurt': { kcal: 60, p: 4, c: 6, f: 2 },
  'smør': { kcal: 740, p: 0.5, c: 0, f: 82 },
  
  // Fedt
  'olie': { kcal: 900, p: 0, c: 0, f: 100 },
  'olivenolie': { kcal: 900, p: 0, c: 0, f: 100 },
  'rapsolie': { kcal: 900, p: 0, c: 0, f: 100 },
  
  // Grøntsager
  'løg': { kcal: 40, p: 1, c: 9, f: 0.1 },
  'hvidløg': { kcal: 150, p: 6, c: 33, f: 0.5 },
  'gulerødder': { kcal: 41, p: 1, c: 10, f: 0.2 },
  'gulerod': { kcal: 41, p: 1, c: 10, f: 0.2 },
  'broccoli': { kcal: 34, p: 3, c: 7, f: 0.4 },
  'spinat': { kcal: 23, p: 3, c: 4, f: 0.4 },
  'tomat': { kcal: 18, p: 1, c: 4, f: 0.2 },
  'tomater': { kcal: 18, p: 1, c: 4, f: 0.2 },
  'flåede tomater': { kcal: 20, p: 1, c: 4, f: 0.1 },
  'peberfrugt': { kcal: 30, p: 1, c: 6, f: 0.3 },
  'squash': { kcal: 17, p: 1, c: 3, f: 0.3 },
  'aubergine': { kcal: 25, p: 1, c: 6, f: 0.2 },
  'champignon': { kcal: 22, p: 3, c: 3, f: 0.3 },
  'svampe': { kcal: 22, p: 3, c: 3, f: 0.3 },
  'salat': { kcal: 15, p: 1, c: 3, f: 0.2 },
  'kål': { kcal: 25, p: 1, c: 6, f: 0.1 },
  'bønner': { kcal: 30, p: 2, c: 5, f: 0.2 },
  'ærter': { kcal: 80, p: 5, c: 14, f: 0.4 },
  'majs': { kcal: 86, p: 3, c: 19, f: 1.2 },
  'avocado': { kcal: 160, p: 2, c: 9, f: 15 },
  
  // Bælgfrugter
  'linser': { kcal: 115, p: 9, c: 20, f: 0.4 },
  'kikærter': { kcal: 120, p: 8, c: 18, f: 2 },
  'kidneybønner': { kcal: 110, p: 7, c: 18, f: 0.5 },
  'sorte bønner': { kcal: 130, p: 9, c: 22, f: 0.5 },
  
  // Andet
  'kokosmælk': { kcal: 200, p: 2, c: 4, f: 21 },
  'pesto': { kcal: 470, p: 5, c: 4, f: 48 },
  'tomatpuré': { kcal: 80, p: 4, c: 17, f: 0.5 },
  'sojasauce': { kcal: 60, p: 6, c: 6, f: 0 },
};

// ============ MAKRO-BEREGNING FRA INGREDIENSER ============
interface CalculatedMacros {
  totalKcal: number;
  totalP: number;
  totalC: number;
  totalF: number;
  perPortionKcal: number;
  perPortionP: number;
  perPortionC: number;
  perPortionF: number;
  matchedIngredients: number;
  totalIngredients: number;
}

function calculateMacrosFromIngredients(ingredients: any[], servings: number): CalculatedMacros {
  let total = { kcal: 0, p: 0, c: 0, f: 0 };
  let matchedCount = 0;
  
  for (const ing of ingredients || []) {
    const name = (ing.name || '').toLowerCase().trim();
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();
    
    // Konverter til gram
    if (unit === 'kg') amount *= 1000;
    if (unit === 'dl') amount *= 100;
    if (unit === 'l' || unit === 'liter') amount *= 1000;
    if (unit === 'spsk' || unit === 'tbsp') amount *= 15;
    if (unit === 'tsk' || unit === 'tsp') amount *= 5;
    
    // Håndter æg (stk)
    if ((unit === 'stk' || unit === '') && (name.includes('æg') || name === 'æg')) {
      amount *= 60; // 1 æg ≈ 60g
    }
    
    // Find matching ingredient i database
    let match: { kcal: number; p: number; c: number; f: number } | null = null;
    
    // Prøv eksakt match først
    if (MACRO_DB[name]) {
      match = MACRO_DB[name];
    } else {
      // Prøv delvis match
      for (const [key, value] of Object.entries(MACRO_DB)) {
        if (name.includes(key) || key.includes(name)) {
          match = value;
          break;
        }
      }
    }
    
    if (match && (unit === 'g' || unit === 'gram' || unit === 'kg' || unit === 'ml' || unit === 'dl' || 
        unit === 'l' || unit === 'stk' || unit === '' || unit === 'spsk' || unit === 'tsk')) {
      const factor = amount / 100;
      total.kcal += match.kcal * factor;
      total.p += match.p * factor;
      total.c += match.c * factor;
      total.f += match.f * factor;
      matchedCount++;
    }
  }
  
  return {
    totalKcal: Math.round(total.kcal),
    totalP: Math.round(total.p),
    totalC: Math.round(total.c),
    totalF: Math.round(total.f),
    perPortionKcal: Math.round(total.kcal / servings),
    perPortionP: Math.round(total.p / servings),
    perPortionC: Math.round(total.c / servings),
    perPortionF: Math.round(total.f / servings),
    matchedIngredients: matchedCount,
    totalIngredients: (ingredients || []).length,
  };
}

// ============ STRENG VALIDERING + AUTO-KORREKTION ============
interface ValidationResult {
  valid: boolean;
  corrected: boolean;
  errors: string[];
  calculated: CalculatedMacros;
  correctedRecipe: any;
}

function strictValidateAndCorrectRecipe(recipe: any): ValidationResult {
  const errors: string[] = [];
  const servings = recipe.servings || 1;
  
  // Beregn makroer fra ingredienser
  const calculated = calculateMacrosFromIngredients(recipe.ingredients, servings);
  
  // Tjek om vi matchede nok ingredienser
  const matchRatio = calculated.totalIngredients > 0 
    ? calculated.matchedIngredients / calculated.totalIngredients 
    : 0;
  
  if (matchRatio < 0.5) {
    console.warn(`Recipe "${recipe.title}": Only matched ${calculated.matchedIngredients}/${calculated.totalIngredients} ingredients`);
  }
  
  // 1. Tjek kalorier (max 30% afvigelse eller brug beregnet)
  const kcalDiff = Math.abs(calculated.perPortionKcal - recipe.calories);
  const kcalDeviation = recipe.calories > 0 ? kcalDiff / recipe.calories : 1;
  
  if (kcalDeviation > 0.3 && calculated.matchedIngredients >= 3) {
    errors.push(`Kalorier: beregnet ${calculated.perPortionKcal} vs påstået ${recipe.calories} (${Math.round(kcalDeviation * 100)}% afvigelse)`);
  }
  
  // 2. Tjek protein (max 30% afvigelse)
  const proteinDiff = Math.abs(calculated.perPortionP - recipe.protein);
  const proteinDeviation = recipe.protein > 0 ? proteinDiff / recipe.protein : 1;
  
  if (proteinDeviation > 0.3 && calculated.matchedIngredients >= 3) {
    errors.push(`Protein: beregnet ${calculated.perPortionP}g vs påstået ${recipe.protein}g (${Math.round(proteinDeviation * 100)}% afvigelse)`);
  }
  
  // 3. Tjek makro-sum konsistens
  const macroKcal = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fat * 9);
  if (Math.abs(macroKcal - recipe.calories) > 100) {
    errors.push(`Makro-sum: ${macroKcal} ≠ ${recipe.calories} kcal`);
  }
  
  // 4. Korriger hvis vi har nok data og store afvigelser
  const shouldCorrect = errors.length > 0 && calculated.matchedIngredients >= 3 && matchRatio >= 0.4;
  
  let correctedRecipe = { ...recipe };
  
  if (shouldCorrect) {
    console.log(`🔧 Correcting "${recipe.title}": ${errors.join(', ')}`);
    console.log(`   Calculated: ${calculated.perPortionKcal} kcal, ${calculated.perPortionP}g P, ${calculated.perPortionC}g C, ${calculated.perPortionF}g F`);
    console.log(`   Original: ${recipe.calories} kcal, ${recipe.protein}g P, ${recipe.carbs}g C, ${recipe.fat}g F`);
    
    correctedRecipe = {
      ...recipe,
      calories: calculated.perPortionKcal,
      protein: calculated.perPortionP,
      carbs: calculated.perPortionC,
      fat: calculated.perPortionF,
      _corrected: true,
      _original: {
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      },
      _calculated: calculated,
    };
  }
  
  return {
    valid: errors.length === 0,
    corrected: shouldCorrect,
    errors,
    calculated,
    correctedRecipe,
  };
}

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
    const peopleCount = profile?.people_count || 1;
    
    const simplifiedPrompt = `
🍽️ OPSKRIFT-REGLER (Valdemarsro-stil):
- Max 10-12 ingredienser
- KONKRETE mængder (ingen "efter smag")
- Trin-for-trin med tider

⚠️ KRITISK: INGREDIENS-MÆNGDER ER SAMLET FOR ALLE ${peopleCount} PERSONER!
Eksempel: 100g pasta/person × ${peopleCount} = "${100 * peopleCount}g" i ingredienslisten

📐 REALISTISKE PORTIONER (per person):
• Kød/fisk: 120-180g rå
• Pasta/ris (tør): 75-100g
• Kartofler: 200-300g
• Ost: 30-50g

📊 MAKROER = PER PORTION (beregnet fra ingredienser)
- Jeg validerer dine makroer automatisk
- Hvis de er forkerte, korrigerer jeg dem
- Så vær præcis!`;

    const systemPrompt = `Du er en erfaren dansk madplanlægger inspireret af Valdemarsro.dk.
${customRequestSection}
${discoverPreferencesSection}

${simplifiedPrompt}

🔴 KRITISKE REGLER (UFRAVIGELIGE):
1. ALDRIG brug disse (allergener): ${allergenNames.length > 0 ? allergenNames.join(', ') : 'Ingen'}
2. ALDRIG foreslå disse (bruger hader): ${allDislikes.length > 0 ? allDislikes.slice(0, 15).join(', ') : 'Ingen'}
3. Hver ret skal ramme ca. ${Math.round(availableCalories / mealsPerDay)} kcal
4. Protein per ret: ~${Math.round(availableProtein / mealsPerDay)}g

📋 MADLAVNINGSSTIL:
${cookingStyleDescription}

${proteinOffersSection}
${inventorySection}
${focusSection}

🟠 TILBUD (brug disse!):
${formattedOffers || 'Ingen tilbud'}

🟡 ANDRE PRIORITETER:
1. Ingredienser bruger elsker: ${allLikes.slice(0, 15).join(', ') || 'Ingen'}
2. Sæsonvarer (${season}): ${seasonalIngredients.join(', ')}
3. Max ${weekdayMaxTime}-${weekendMaxTime} min tilberedning
4. Undgå nylige retter: ${recentMealTitles.length > 0 ? recentMealTitles.slice(0, 8).join(', ') : 'Ingen'}

📊 OUTPUT (KUN JSON):
{
  "recipes": [
    {
      "id": "unique-id",
      "title": "Ret navn",
      "description": "Kort beskrivelse",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "prep_time": number,
      "cook_time": number,
      "servings": ${peopleCount},
      "ingredients": [
        {"name": "spaghetti", "amount": "${100 * peopleCount}", "unit": "g"},
        {"name": "bacon", "amount": "${120 * peopleCount}", "unit": "g"}
      ],
      "instructions": ["Trin 1 med mængder (kog ${100 * peopleCount}g pasta)", "Trin 2"],
      "tags": ["hurtig", "høj-protein"],
      "key_ingredients": ["hovedingrediens1", "hovedingrediens2"],
      "uses_offers": [{"offer_text": "string", "store": "string", "savings": number}],
      "estimated_price": number
    }
  ]
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

    // ============ STRENG VALIDERING + AUTO-KORREKTION ============
    const rawRecipes = mealPlanData.recipes || [];
    const validatedRecipes = rawRecipes.map((recipe: any) => {
      const validation = strictValidateAndCorrectRecipe(recipe);
      
      if (!validation.valid) {
        console.warn(`⚠️ Recipe "${recipe.title}" validation issues:`, validation.errors.join(', '));
      }
      
      if (validation.corrected) {
        console.log(`✅ Recipe "${recipe.title}" auto-corrected`);
      }
      
      return validation.correctedRecipe;
    });
    
    // Log summary
    const correctedCount = validatedRecipes.filter((r: any) => r._corrected).length;
    console.log(`📊 Validation summary: ${correctedCount}/${validatedRecipes.length} recipes auto-corrected`);

    return new Response(JSON.stringify({
      success: true,
      recipes: validatedRecipes,
      recipes_needed: recipesNeeded,
      macro_targets: {
        calories: availableCalories,
        protein: availableProtein,
        carbs: baseCarbs,
        fat: baseFat,
      },
      total_estimated_savings: mealPlanData.total_estimated_savings || 0,
      _validation_stats: {
        total: validatedRecipes.length,
        corrected: correctedCount,
      },
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
