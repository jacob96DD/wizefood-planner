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

// Konverter mængde til base-enhed (kg, l, stk)
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
  
  // Stk/pk - direkte
  return amount;
};

// Find pris-info for en ingrediens
const findPriceInfo = (name: string): PriceInfo | null => {
  const lowerName = name.toLowerCase().trim();
  
  // Direkt match
  if (PRICES_PER_UNIT[lowerName]) {
    return PRICES_PER_UNIT[lowerName];
  }
  
  // Delvis match
  for (const [key, info] of Object.entries(PRICES_PER_UNIT)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return info;
    }
  }
  
  return null;
};

// Beregn pris baseret på mængde og enhed
const calculateIngredientPrice = (name: string, amount: number, unit: string): number => {
  const priceInfo = findPriceInfo(name);
  
  if (!priceInfo) {
    // Fallback: antag 15 kr per ingrediens
    return 15;
  }
  
  const amountInBase = convertToBaseUnit(amount, unit, priceInfo.unit);
  return Math.round(priceInfo.price * amountInBase);
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
        .select('ingredient_name, quantity, unit')
        .eq('user_id', user.id)
        .eq('is_depleted', false);

      const inventoryMap = new Map<string, { quantity: number; unit: string }>();
      inventory?.forEach(item => {
        inventoryMap.set(item.ingredient_name.toLowerCase(), {
          quantity: item.quantity || 0,
          unit: item.unit || '',
        });
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

      // 4. Build shopping list items
      const shoppingItems: ShoppingListItem[] = [];

      ingredientMap.forEach((value, ingredientName) => {
        // Check if user already has enough
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
          // Reelt tilbud fundet
          item.offerPrice = matchingOffer.offer_price_dkk;
          item.price = matchingOffer.original_price_dkk || undefined;
          item.offerId = matchingOffer.id;
          item.isEstimate = false;
          // Gem butiksnavn fra JOIN
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
