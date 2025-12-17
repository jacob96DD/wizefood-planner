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

// Estimerede standardpriser for almindelige ingredienser (DKK)
const ESTIMATED_PRICES: Record<string, number> = {
  // Mejeriprodukter
  'mælk': 12, 'letmælk': 12, 'minimælk': 12, 'sødmælk': 14,
  'smør': 25, 'margarine': 18,
  'ost': 35, 'cheddar': 40, 'parmesan': 45, 'mozzarella': 30, 'feta': 28,
  'fløde': 15, 'piskefløde': 18, 'cremefraiche': 16, 'creme fraiche': 16,
  'yoghurt': 15, 'skyr': 18, 'græsk yoghurt': 20,
  'æg': 30, 'æg 10 stk': 35, 'æg 6 stk': 22,
  
  // Kød og fisk
  'kylling': 45, 'kyllingebryst': 55, 'kyllingelår': 40, 'hel kylling': 50,
  'hakket oksekød': 50, 'oksekød': 65, 'bøf': 80, 'roastbeef': 90,
  'hakket svinekød': 40, 'svinekød': 50, 'nakkefilet': 55, 'schnitzel': 45,
  'flæsk': 35, 'bacon': 30, 'skinke': 35,
  'laks': 70, 'torsk': 60, 'rødspætte': 55, 'tun': 25, 'rejer': 50,
  'pølser': 25, 'medister': 30,
  
  // Grøntsager
  'kartofler': 15, 'kartoffel': 15, 'nye kartofler': 18,
  'løg': 8, 'rødløg': 10, 'forårsløg': 12, 'porrer': 15,
  'hvidløg': 10, 'hvidløgsfed': 10,
  'gulerødder': 12, 'gulerod': 12,
  'tomat': 15, 'tomater': 15, 'cherrytomater': 18, 'hakkede tomater': 10,
  'agurk': 10, 'salat': 15, 'iceberg': 15, 'rucola': 18,
  'spinat': 18, 'broccoli': 15, 'blomkål': 18, 'grønkål': 15,
  'peberfrugt': 12, 'chili': 8, 'jalapeño': 10,
  'squash': 12, 'aubergine': 15, 'champignon': 18, 'svampe': 18,
  'avocado': 15, 'majs': 12, 'ærter': 15, 'bønner': 12,
  'kål': 12, 'hvidkål': 12, 'rødkål': 15, 'spidskål': 15,
  'selleri': 15, 'ingefær': 12, 'citron': 8, 'lime': 8,
  
  // Frugt
  'æble': 15, 'æbler': 15, 'banan': 12, 'bananer': 12,
  'appelsin': 18, 'appelsiner': 18, 'citrus': 15,
  'jordbær': 25, 'hindbær': 30, 'blåbær': 28,
  'vindrue': 25, 'vindruer': 25, 'melon': 20,
  
  // Tørvarer
  'pasta': 15, 'spaghetti': 15, 'penne': 15, 'fusilli': 15, 'makaroni': 15,
  'ris': 20, 'jasminris': 22, 'basmatiris': 25, 'brune ris': 22,
  'mel': 12, 'hvedemel': 12,
  'sukker': 15, 'rørsukker': 18, 'flormelis': 12,
  'salt': 8, 'peber': 15, 'krydderier': 18,
  'olie': 30, 'olivenolie': 45, 'rapsolie': 25,
  'eddike': 15, 'balsamico': 25,
  'sojasauce': 18, 'fiskesauce': 20,
  'tomatpuré': 12, 'tomatsauce': 15,
  'bouillon': 15, 'hønsebouillon': 15, 'oksebouillon': 15,
  'kokosmælk': 18, 'kokoscreme': 20,
  
  // Brød og bagværk
  'brød': 20, 'rugbrød': 22, 'franskbrød': 15, 'toastbrød': 18,
  'boller': 15, 'pitabrød': 18, 'tortilla': 20, 'wraps': 20,
  'havregryn': 18, 'müsli': 30, 'cornflakes': 25,
  
  // Drikkevarer og andet
  'kaffe': 40, 'te': 25,
  'honning': 35, 'marmelade': 20, 'nutella': 35,
  'mayonnaise': 20, 'ketchup': 18, 'sennep': 15, 'dressing': 20,
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

      // 3. Fetch current offers to match with ingredients (inkluder offer_text)
      const { data: offers } = await supabase
        .from('offers')
        .select('id, product_name, offer_text, offer_price_dkk, original_price_dkk, chain_id')
        .eq('is_active', true);

      // Helper: Find estimeret pris baseret på ingrediensnavn
      const findEstimatedPrice = (name: string): number | null => {
        const lowerName = name.toLowerCase();
        
        // Direkt match
        if (ESTIMATED_PRICES[lowerName]) {
          return ESTIMATED_PRICES[lowerName];
        }
        
        // Delvis match (ingrediens indeholder nøgleord)
        for (const [key, price] of Object.entries(ESTIMATED_PRICES)) {
          if (lowerName.includes(key) || key.includes(lowerName)) {
            return price;
          }
        }
        
        return null;
      };

      // Helper: Forbedret tilbuds-matching via product_name OG offer_text
      const findMatchingOffer = (ingredientName: string) => {
        if (!offers) return null;
        
        return offers.find(o => {
          const productName = (o.product_name || '').toLowerCase();
          const offerText = (o.offer_text || '').toLowerCase();
          const searchText = `${productName} ${offerText}`;
          
          // Match hvis ingrediensnavn findes i product_name eller offer_text
          if (searchText.includes(ingredientName)) return true;
          
          // Match hvis første ord af tilbuddet matcher ingrediensen
          const firstWord = (productName || offerText).split(' ')[0];
          if (firstWord && ingredientName.includes(firstWord)) return true;
          
          return false;
        });
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
        } else {
          // Ingen tilbud - brug estimeret pris
          const estimatedPrice = findEstimatedPrice(ingredientName);
          if (estimatedPrice) {
            item.price = estimatedPrice;
            item.isEstimate = true;
          }
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
