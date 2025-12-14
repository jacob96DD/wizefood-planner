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

      // 3. Fetch current offers to match with ingredients
      const { data: offers } = await supabase
        .from('offers')
        .select('id, product_name, offer_price_dkk, original_price_dkk, chain_id')
        .eq('is_active', true);

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

        // Check for matching offers
        const matchingOffer = offers?.find(o => 
          o.product_name?.toLowerCase().includes(ingredientName) ||
          ingredientName.includes(o.product_name?.toLowerCase() || '')
        );

        const item: ShoppingListItem = {
          id: crypto.randomUUID(),
          name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1),
          amount: neededAmount.toString(),
          unit: value.unit,
          checked: false,
        };

        if (matchingOffer) {
          item.offerPrice = matchingOffer.offer_price_dkk || undefined;
          item.price = matchingOffer.original_price_dkk || undefined;
          item.offerId = matchingOffer.id;
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
