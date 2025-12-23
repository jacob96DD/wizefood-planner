import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import type { MealRecipe } from '@/components/MealOptionSwiper';
import type { ShoppingListItem } from '@/hooks/useShoppingList';
import type { Json } from '@/integrations/supabase/types';

interface SelectedMeals {
  breakfast: MealRecipe[];
  lunch: MealRecipe[];
  dinner: MealRecipe[];
}

// Priser per kg/liter/stk - realistiske danske 2024-priser
interface PriceInfo {
  price: number;  // Pris per enhed
  unit: 'kg' | 'l' | 'stk' | 'pk';
}

const PRICES_PER_UNIT: Record<string, PriceInfo> = {
  // Kød (per kg) - 2024 danske priser
  'oksekød': { price: 130, unit: 'kg' },
  'hakket oksekød': { price: 100, unit: 'kg' },
  'bøf': { price: 160, unit: 'kg' },
  'roastbeef': { price: 180, unit: 'kg' },
  'kylling': { price: 80, unit: 'kg' },
  'kyllingebryst': { price: 90, unit: 'kg' },
  'kyllingelår': { price: 60, unit: 'kg' },
  'hel kylling': { price: 50, unit: 'kg' },
  'svinekød': { price: 70, unit: 'kg' },
  'hakket svinekød': { price: 60, unit: 'kg' },
  'nakkefilet': { price: 80, unit: 'kg' },
  'flæsk': { price: 50, unit: 'kg' },
  'bacon': { price: 120, unit: 'kg' },
  'skinke': { price: 100, unit: 'kg' },
  
  // Fisk (per kg)
  'laks': { price: 180, unit: 'kg' },
  'torsk': { price: 140, unit: 'kg' },
  'rødspætte': { price: 120, unit: 'kg' },
  'tun': { price: 80, unit: 'pk' },  // dåse
  'rejer': { price: 200, unit: 'kg' },
  
  // Mejeriprodukter
  'mælk': { price: 12, unit: 'l' },
  'letmælk': { price: 12, unit: 'l' },
  'minimælk': { price: 12, unit: 'l' },
  'sødmælk': { price: 14, unit: 'l' },
  'fløde': { price: 28, unit: 'l' },
  'piskefløde': { price: 28, unit: 'l' },
  'cremefraiche': { price: 32, unit: 'l' },
  'creme fraiche': { price: 32, unit: 'l' },
  'smør': { price: 100, unit: 'kg' },
  'margarine': { price: 50, unit: 'kg' },
  'ost': { price: 100, unit: 'kg' },
  'cheddar': { price: 120, unit: 'kg' },
  'parmesan': { price: 200, unit: 'kg' },
  'mozzarella': { price: 80, unit: 'kg' },
  'feta': { price: 90, unit: 'kg' },
  'yoghurt': { price: 20, unit: 'l' },
  'skyr': { price: 25, unit: 'l' },
  'græsk yoghurt': { price: 30, unit: 'l' },
  'æg': { price: 3, unit: 'stk' },
  
  // Grøntsager (per kg)
  'kartofler': { price: 15, unit: 'kg' },
  'kartoffel': { price: 15, unit: 'kg' },
  'løg': { price: 15, unit: 'kg' },
  'rødløg': { price: 25, unit: 'kg' },
  'forårsløg': { price: 10, unit: 'stk' },
  'porrer': { price: 25, unit: 'kg' },
  'hvidløg': { price: 5, unit: 'stk' },
  'hvidløgsfed': { price: 1, unit: 'stk' },
  'gulerødder': { price: 15, unit: 'kg' },
  'gulerod': { price: 15, unit: 'kg' },
  'tomat': { price: 30, unit: 'kg' },
  'tomater': { price: 30, unit: 'kg' },
  'cherrytomater': { price: 50, unit: 'kg' },
  'hakkede tomater': { price: 10, unit: 'pk' },
  'agurk': { price: 10, unit: 'stk' },
  'salat': { price: 15, unit: 'stk' },
  'iceberg': { price: 15, unit: 'stk' },
  'rucola': { price: 25, unit: 'pk' },
  'spinat': { price: 40, unit: 'kg' },
  'broccoli': { price: 30, unit: 'kg' },
  'blomkål': { price: 25, unit: 'stk' },
  'grønkål': { price: 30, unit: 'kg' },
  'peberfrugt': { price: 40, unit: 'kg' },
  'chili': { price: 5, unit: 'stk' },
  'squash': { price: 25, unit: 'kg' },
  'aubergine': { price: 30, unit: 'kg' },
  'champignon': { price: 60, unit: 'kg' },
  'svampe': { price: 60, unit: 'kg' },
  'avocado': { price: 15, unit: 'stk' },
  'majs': { price: 10, unit: 'pk' },
  'ærter': { price: 20, unit: 'pk' },
  'bønner': { price: 15, unit: 'pk' },
  'kål': { price: 15, unit: 'kg' },
  'hvidkål': { price: 15, unit: 'kg' },
  'rødkål': { price: 20, unit: 'kg' },
  'spidskål': { price: 20, unit: 'stk' },
  'selleri': { price: 15, unit: 'stk' },
  'ingefær': { price: 80, unit: 'kg' },
  'citron': { price: 5, unit: 'stk' },
  'lime': { price: 5, unit: 'stk' },
  
  // Frugt
  'æble': { price: 25, unit: 'kg' },
  'æbler': { price: 25, unit: 'kg' },
  'banan': { price: 20, unit: 'kg' },
  'bananer': { price: 20, unit: 'kg' },
  'appelsin': { price: 20, unit: 'kg' },
  'appelsiner': { price: 20, unit: 'kg' },
  
  // Tørvarer
  'pasta': { price: 20, unit: 'kg' },
  'spaghetti': { price: 20, unit: 'kg' },
  'penne': { price: 20, unit: 'kg' },
  'fusilli': { price: 20, unit: 'kg' },
  'makaroni': { price: 20, unit: 'kg' },
  'ris': { price: 25, unit: 'kg' },
  'jasminris': { price: 30, unit: 'kg' },
  'basmatiris': { price: 35, unit: 'kg' },
  'mel': { price: 15, unit: 'kg' },
  'hvedemel': { price: 15, unit: 'kg' },
  'sukker': { price: 15, unit: 'kg' },
  'salt': { price: 10, unit: 'kg' },
  'peber': { price: 200, unit: 'kg' },
  'olie': { price: 30, unit: 'l' },
  'olivenolie': { price: 60, unit: 'l' },
  'rapsolie': { price: 25, unit: 'l' },
  'eddike': { price: 20, unit: 'l' },
  'balsamico': { price: 50, unit: 'l' },
  'sojasauce': { price: 40, unit: 'l' },
  'tomatpuré': { price: 15, unit: 'pk' },
  'tomatsauce': { price: 15, unit: 'pk' },
  'bouillon': { price: 20, unit: 'pk' },
  'hønsebouillon': { price: 20, unit: 'pk' },
  'oksebouillon': { price: 20, unit: 'pk' },
  'kokosmælk': { price: 15, unit: 'pk' },
  
  // Brød
  'brød': { price: 20, unit: 'stk' },
  'rugbrød': { price: 25, unit: 'stk' },
  'franskbrød': { price: 15, unit: 'stk' },
  'toastbrød': { price: 18, unit: 'stk' },
  'tortilla': { price: 25, unit: 'pk' },
  'wraps': { price: 25, unit: 'pk' },
  'pitabrød': { price: 20, unit: 'pk' },
  'havregryn': { price: 20, unit: 'kg' },
  
  // Krydderier og sauce
  'pølser': { price: 60, unit: 'kg' },
  'medister': { price: 50, unit: 'kg' },
  'mayonnaise': { price: 40, unit: 'l' },
  'ketchup': { price: 30, unit: 'l' },
  'sennep': { price: 25, unit: 'l' },
  'honning': { price: 80, unit: 'kg' },
};

// Konverter mængde til base-enhed (kg, l, stk, pk)
const convertToBaseUnit = (amount: number, unit: string, targetUnit: string): number => {
  const lowerUnit = unit.toLowerCase().trim();
  
  // Vægt-konvertering til kg
  if (targetUnit === 'kg') {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return amount / 1000;
    if (lowerUnit === 'kg' || lowerUnit === 'kilo') return amount;
    // Antag gram hvis bare tal
    if (amount > 10) return amount / 1000;
    return amount;
  }
  
  // Volumen-konvertering til liter
  if (targetUnit === 'l') {
    if (lowerUnit === 'ml' || lowerUnit === 'milliliter') return amount / 1000;
    if (lowerUnit === 'dl' || lowerUnit === 'deciliter') return amount / 10;
    if (lowerUnit === 'l' || lowerUnit === 'liter') return amount;
    // Antag ml hvis stort tal
    if (amount > 10) return amount / 1000;
    return amount;
  }
  
  // Stk/pk - konverter fra ml/dl/l/g/kg til antal pakker
  if (targetUnit === 'pk' || targetUnit === 'stk') {
    // Volumen til pakker (typisk pakke = 400ml)
    if (lowerUnit === 'ml' || lowerUnit === 'milliliter') {
      return Math.ceil(amount / 400);
    }
    if (lowerUnit === 'dl' || lowerUnit === 'deciliter') {
      return Math.ceil(amount / 4); // 4 dl = 400ml
    }
    if (lowerUnit === 'l' || lowerUnit === 'liter') {
      return Math.ceil(amount * 2.5); // 1L = 2.5 pakker á 400ml
    }
    // Vægt til pakker (typisk pakke = 400g)
    if (lowerUnit === 'g' || lowerUnit === 'gram') {
      return Math.ceil(amount / 400);
    }
    if (lowerUnit === 'kg' || lowerUnit === 'kilo') {
      return Math.ceil(amount * 2.5); // 1kg = 2.5 pakker á 400g
    }
    // Direkte stk/pk
    return Math.max(1, Math.ceil(amount));
  }
  
  return amount;
};

// Find pris-info for en ingrediens - med word boundary matching for at undgå false positives
const findPriceInfo = (name: string): PriceInfo | null => {
  const lowerName = name.toLowerCase().trim();
  
  // 1. Direkt match (højeste prioritet)
  if (PRICES_PER_UNIT[lowerName]) {
    return PRICES_PER_UNIT[lowerName];
  }
  
  // 2. Delvis match - KRÆV minimum 4 tegn for at undgå false positives som "mel" → "Castello"
  for (const [key, info] of Object.entries(PRICES_PER_UNIT)) {
    // Spring over korte ord der giver false positives
    if (key.length < 4) continue;
    
    // Brug word boundary matching - kræv at key er et helt ord
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lowerName)) {
      return info;
    }
  }
  
  // 3. Forsøg omvendt match kun for længere keys
  for (const [key, info] of Object.entries(PRICES_PER_UNIT)) {
    if (key.length < 5) continue;
    
    const regex = new RegExp(`\\b${lowerName}\\b`, 'i');
    if (regex.test(key)) {
      return info;
    }
  }
  
  return null;
};

// Beregn pris baseret på mængde og enhed - REALISTISKE DANSKE PRISER 2024
const calculateIngredientPrice = (name: string, amount: number, unit: string): number => {
  const lowerUnit = unit.toLowerCase();
  const lowerName = name.toLowerCase();

  // ===== DIREKTE PRISBEREGNING BASERET PÅ INGREDIENS-TYPE =====

  // Kød (ca. 80-120 kr/kg)
  if (lowerName.includes('kylling') || lowerName.includes('chicken')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 1000 * 80);
    if (lowerUnit === 'kg') return Math.ceil(amount * 80);
  }
  if (lowerName.includes('flæsk') || lowerName.includes('svine')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 1000 * 70);
    if (lowerUnit === 'kg') return Math.ceil(amount * 70);
  }
  if (lowerName.includes('okse') || lowerName.includes('hakket')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 1000 * 100);
    if (lowerUnit === 'kg') return Math.ceil(amount * 100);
  }
  if (lowerName.includes('bacon')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 200) * 25; // 200g pakker á 25 kr
    if (lowerUnit === 'kg') return Math.ceil(amount * 125);
  }

  // Mejeriprodukter
  if (lowerName.includes('fløde') || lowerName.includes('piskefløde')) {
    if (lowerUnit === 'dl') return Math.ceil(amount / 5) * 15; // 0.5L á 15 kr
    if (lowerUnit === 'l' || lowerUnit === 'liter') return Math.ceil(amount * 2) * 15;
  }
  if (lowerName.includes('mælk') && !lowerName.includes('kokos')) {
    if (lowerUnit === 'dl') return Math.ceil(amount / 10) * 12; // 1L á 12 kr
    if (lowerUnit === 'l' || lowerUnit === 'liter') return Math.ceil(amount) * 12;
  }
  if (lowerName.includes('kokosmælk')) {
    if (lowerUnit === 'dl') return Math.ceil(amount / 4) * 15; // 400ml dåse á 15 kr
  }
  if (lowerName.includes('smør')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 250) * 25; // 250g á 25 kr
  }
  if (lowerName.includes('ost') || lowerName.includes('feta')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 200) * 25; // 200g á 25 kr
  }
  if (lowerName.includes('æg')) {
    if (lowerUnit === 'stk') return Math.ceil(amount / 10) * 30; // 10 stk á 30 kr
  }

  // Brød og wraps - PAKKE-PRISER
  if (lowerName.includes('tortilla') || lowerName.includes('wrap')) {
    if (lowerUnit === 'stk') return Math.ceil(amount / 8) * 25; // 8 stk/pakke á 25 kr
  }
  if (lowerName.includes('rugbrød')) {
    if (lowerUnit === 'stk' || lowerUnit === 'skiver') return Math.ceil(amount / 12) * 25; // 1 brød á 25 kr
  }

  // Grøntsager
  if (lowerName.includes('kartof')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 1000 * 15);
    if (lowerUnit === 'kg') return Math.ceil(amount * 15);
  }
  if (lowerName.includes('løg') && !lowerName.includes('hvidløg')) {
    if (lowerUnit === 'stk') return Math.ceil(amount / 3) * 10; // Net á 10 kr
  }
  if (lowerName.includes('hvidløg')) {
    if (lowerUnit === 'fed') return Math.ceil(amount / 10) * 8; // 1 hoved á 8 kr
    if (lowerUnit === 'stk') return Math.ceil(amount) * 8;
  }
  if (lowerName.includes('agurk')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 400) * 10; // 1 agurk á 10 kr
    if (lowerUnit === 'stk') return Math.ceil(amount) * 10;
  }
  if (lowerName.includes('rødkål')) {
    if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 500) * 15; // Glas á 15 kr
  }

  // Krydderier - små faste priser (antager man har det meste)
  if (lowerUnit === 'tsk' || lowerUnit === 'spsk') {
    return 5; // Krydderier er billige per portion
  }
  if (lowerName.includes('garam') || lowerName.includes('karry') || lowerName.includes('krydderi')) {
    return 10;
  }

  // ===== GENEREL FALLBACK =====
  const priceInfo = findPriceInfo(name);
  if (priceInfo) {
    // Konverter til base-enhed og beregn
    if (priceInfo.unit === 'kg') {
      if (lowerUnit === 'g' || lowerUnit === 'gram') return Math.ceil(amount / 1000 * priceInfo.price);
      if (lowerUnit === 'kg') return Math.ceil(amount * priceInfo.price);
    }
    if (priceInfo.unit === 'l') {
      if (lowerUnit === 'ml') return Math.ceil(amount / 1000 * priceInfo.price);
      if (lowerUnit === 'dl') return Math.ceil(amount / 10 * priceInfo.price);
      if (lowerUnit === 'l' || lowerUnit === 'liter') return Math.ceil(amount * priceInfo.price);
    }
    if (priceInfo.unit === 'stk') {
      return Math.ceil(amount) * priceInfo.price;
    }
    if (priceInfo.unit === 'pk') {
      return Math.ceil(amount / 4) * priceInfo.price; // Antag 4 stk per pakke som default
    }
  }

  // Absolut fallback
  return 15;
};

export function useGenerateShoppingList() {
  const [generating, setGenerating] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const generateShoppingList = async (
    selectedMeals: SelectedMeals,
    mealPlanId?: string
  ): Promise<string | null> => {
    if (!user) return null;

    setGenerating(true);
    try {
      // 1. Collect all ingredients from selected meals
      const allMeals = [
        ...selectedMeals.breakfast,
        ...selectedMeals.lunch,
        ...selectedMeals.dinner,
      ];

      const ingredientMap = new Map<string, { amount: number; unit: string; sources: string[] }>();

      allMeals.forEach(meal => {
        meal.ingredients?.forEach(ing => {
          const key = ing.name.toLowerCase().trim();
          const existing = ingredientMap.get(key);
          
          // Parse amount
          const amount = parseFloat(ing.amount) || 1;
          
          if (existing) {
            // Add to existing
            existing.amount += amount;
            if (!existing.sources.includes(meal.title)) {
              existing.sources.push(meal.title);
            }
          } else {
            ingredientMap.set(key, {
              amount,
              unit: ing.unit || 'stk',
              sources: [meal.title],
            });
          }
        });
      });

      // 2. Fetch user's inventory to exclude items they already have
      const { data: inventory } = await supabase
        .from('household_inventory')
        .select('ingredient_name, quantity, unit, category, is_depleted')
        .eq('user_id', user.id);

      const inventoryMap = new Map<string, { quantity: number; unit: string }>();
      const basislagerMap = new Map<string, boolean>(); // name -> is_depleted (true = mangler)
      
      inventory?.forEach(item => {
        if (item.category === 'basislager') {
          // Track basislager items separately
          basislagerMap.set(item.ingredient_name.toLowerCase(), item.is_depleted || false);
        } else if (!item.is_depleted) {
          // Regular inventory items
          inventoryMap.set(item.ingredient_name.toLowerCase(), {
            quantity: item.quantity || 0,
            unit: item.unit || '',
          });
        }
      });

      // 3. Fetch current offers to match with ingredients (inkluder offer_text og butiksnavn)
      const { data: offers } = await supabase
        .from('offers')
        .select('id, product_name, offer_text, offer_price_dkk, original_price_dkk, chain_id, store_chains(name)')
        .eq('is_active', true);

      // Helper: Scoring-baseret tilbuds-matching for præcis matching
      const findMatchingOffer = (ingredientName: string) => {
        if (!offers || offers.length === 0) return null;
        
        const lowerIngredient = ingredientName.toLowerCase().trim();
        const ingredientWords = lowerIngredient.split(/\s+/).filter(w => w.length > 2);
        
        let bestMatch: { offer: typeof offers[0]; score: number } | null = null;
        
        for (const offer of offers) {
          const productName = (offer.product_name || '').toLowerCase();
          const offerText = (offer.offer_text || '').toLowerCase();
          const combinedText = `${productName} ${offerText}`.trim();
          
          if (!combinedText) continue;
          
          let score = 0;
          
          // Eksakt match (højeste prioritet)
          if (combinedText.includes(lowerIngredient)) {
            score = 100;
          }
          // Ingrediens som første ord i tilbud
          else if (combinedText.startsWith(lowerIngredient)) {
            score = 90;
          }
          // Første ord matcher eksakt
          else {
            const firstIngredientWord = ingredientWords[0];
            const offerWords = combinedText.split(/\s+/);
            
            if (firstIngredientWord && offerWords[0] === firstIngredientWord) {
              score = 70;
            }
            // Delvis match på vigtige ord (min 2 matches nødvendig)
            else {
              const matchingWords = ingredientWords.filter(iw => 
                offerWords.some(ow => ow === iw || (iw.length > 3 && ow.startsWith(iw)))
              );
              if (matchingWords.length >= 2) {
                score = matchingWords.length * 25;
              } else if (matchingWords.length === 1 && ingredientWords.length === 1) {
                // Enkelt ord ingrediens der matcher
                score = 60;
              }
            }
          }
          
          // Kun accepter hvis score >= 60 og bedre end nuværende match
          if (score >= 60 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { offer, score };
          }
        }
        
        return bestMatch?.offer || null;
      };

      // 4. Build shopping list items with smart basislager handling
      const shoppingItems: ShoppingListItem[] = [];

      // Common basislager keywords to detect
      const basislagerKeywords = [
        'salt', 'peber', 'olie', 'olivenolie', 'rapsolie', 'smør', 'margarine',
        'mel', 'hvedemel', 'sukker', 'eddike', 'sojasauce', 'bouillon',
        'hønsebouillon', 'oksebouillon', 'karry', 'paprika', 'oregano',
        'timian', 'basilikum', 'persille', 'kanel', 'muskatnød', 'ingefær',
        'hvidløgspulver', 'løgpulver', 'spidskommen', 'gurkemeje', 'chiliflager'
      ];
      
      const isBasislagerIngredient = (name: string): boolean => {
        const lower = name.toLowerCase();
        return basislagerMap.has(lower) || 
          basislagerKeywords.some(kw => lower.includes(kw) || kw.includes(lower));
      };

      ingredientMap.forEach((value, ingredientName) => {
        const isBasislager = isBasislagerIngredient(ingredientName);
        
        // Check if this is a basislager item
        if (isBasislager) {
          const userMissingIt = basislagerMap.get(ingredientName) === true;
          
          if (!userMissingIt) {
            // User HAS this basislager item → SKIP completely
            return;
          }
          
          // User is MISSING it → only add if there's an offer
          const matchingOffer = findMatchingOffer(ingredientName);
          
          if (!matchingOffer) {
            // No offer → wait until next week
            return;
          }
          
          // HAS offer → add to list with offer price!
          const item: ShoppingListItem = {
            id: crypto.randomUUID(),
            name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
            amount: value.amount.toString(),
            unit: value.unit,
            checked: false,
            isEstimate: false,
            offerPrice: matchingOffer.offer_price_dkk || undefined,
            price: matchingOffer.original_price_dkk || undefined,
            offerId: matchingOffer.id,
            store: (matchingOffer.store_chains as { name: string } | null)?.name || undefined,
          };
          shoppingItems.push(item);
          return;
        }
        
        // Regular inventory check
        const inInventory = inventoryMap.get(ingredientName);
        if (inInventory && inInventory.quantity >= value.amount) {
          // Skip - user has enough
          return;
        }

        // Calculate needed amount
        let neededAmount = value.amount;
        if (inInventory) {
          neededAmount = value.amount - inInventory.quantity;
        }

        // Check for matching offers med forbedret matching
        const matchingOffer = findMatchingOffer(ingredientName);

        const item: ShoppingListItem = {
          id: crypto.randomUUID(),
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          amount: neededAmount.toString(),
          unit: value.unit,
          checked: false,
          isEstimate: false,
        };

        if (matchingOffer && matchingOffer.offer_price_dkk) {
          // Reelt tilbud fundet - beregn pris baseret på antal pakker
          const pricePerPack = matchingOffer.offer_price_dkk;
          const originalPerPack = matchingOffer.original_price_dkk || pricePerPack;

          // Beregn antal pakker baseret på mængde og enhed
          const unit = value.unit.toLowerCase();
          let packCount = 1;

          if (unit === 'g' || unit === 'gram') {
            packCount = Math.ceil(neededAmount / 500); // 500g pakker
          } else if (unit === 'kg') {
            packCount = Math.ceil(neededAmount); // 1kg pakker
          } else if (unit === 'dl') {
            packCount = Math.ceil(neededAmount / 5); // 0.5L pakker = 5dl
          } else if (unit === 'l' || unit === 'liter') {
            packCount = Math.ceil(neededAmount); // 1L pakker
          } else if (unit === 'ml') {
            packCount = Math.ceil(neededAmount / 500); // 500ml pakker
          } else if (unit === 'stk') {
            // For 'stk' - tjek om det er noget der sælges i pakker
            const lowerName = ingredientName.toLowerCase();
            if (lowerName.includes('tortilla') || lowerName.includes('wrap') || lowerName.includes('pitabrød')) {
              packCount = Math.ceil(neededAmount / 8); // ~8 stk per pakke
            } else if (lowerName.includes('æg')) {
              packCount = Math.ceil(neededAmount / 10); // 10 æg per bakke
            } else if (lowerName.includes('løg') || lowerName.includes('kartof')) {
              packCount = Math.ceil(neededAmount / 3); // ~3 stk per net/pose
            } else {
              // Default: antag 1 pakke per 4 stk
              packCount = Math.max(1, Math.ceil(neededAmount / 4));
            }
          } else {
            // tsk, spsk, fed osv - typisk 1 pakke
            packCount = 1;
          }

          item.offerPrice = Math.round(pricePerPack * packCount);
          item.price = Math.round(originalPerPack * packCount);
          item.offerId = matchingOffer.id;
          item.isEstimate = false;
          const storeChain = matchingOffer.store_chains as { name: string } | null;
          item.store = storeChain?.name || undefined;
        } else {
          // Ingen tilbud - brug estimeret pris baseret på mængde
          const estimatedPrice = calculateIngredientPrice(ingredientName, neededAmount, value.unit);
          item.price = estimatedPrice;
          item.isEstimate = true;
        }

        shoppingItems.push(item);
      });

      // 5. Calculate total price
      const totalPrice = shoppingItems.reduce((sum, item) => {
        return sum + (item.offerPrice || item.price || 0);
      }, 0);

      // 6. Save to database
      const { data: savedList, error } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          items: shoppingItems as unknown as Json,
          total_price: totalPrice,
          meal_plan_id: mealPlanId || null,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Indkøbsliste oprettet!',
        description: `${shoppingItems.length} varer tilføjet til din liste.`,
      });

      return savedList.id;

    } catch (error) {
      console.error('Error generating shopping list:', error);
      toast({
        title: 'Fejl',
        description: 'Kunne ikke oprette indkøbsliste.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return { generateShoppingList, generating };
}
