import { create } from 'zustand';
import type { Recipe, Swipe } from '@/lib/supabase';

// Mock recipes for demo (will be replaced with Supabase data)
const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Cremet Kylling Pasta',
    description: 'En lækker og nem hverdagsret med cremet sauce og sprød kylling',
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
    prep_time: 15,
    cook_time: 25,
    servings: 4,
    calories: 520,
    protein: 35,
    carbs: 45,
    fat: 22,
    ingredients: [
      { name: 'Kyllingebryst', amount: '400', unit: 'g' },
      { name: 'Pasta', amount: '400', unit: 'g' },
      { name: 'Fløde', amount: '2', unit: 'dl' },
      { name: 'Hvidløg', amount: '3', unit: 'fed' },
      { name: 'Parmesan', amount: '50', unit: 'g' },
    ],
    instructions: [
      'Kog pastaen efter anvisning',
      'Steg kyllingen i terninger',
      'Tilsæt hvidløg og fløde',
      'Bland pasta og sauce',
      'Top med parmesan',
    ],
    tags: ['pasta', 'kylling', 'hurtig'],
  },
  {
    id: '2',
    title: 'Thai Wok med Rejer',
    description: 'Autentisk thai-inspireret wok med friske grøntsager og saftige rejer',
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
    prep_time: 20,
    cook_time: 15,
    servings: 4,
    calories: 380,
    protein: 28,
    carbs: 35,
    fat: 14,
    ingredients: [
      { name: 'Rejer', amount: '400', unit: 'g' },
      { name: 'Wok-grøntsager', amount: '500', unit: 'g' },
      { name: 'Kokosmælk', amount: '4', unit: 'dl' },
      { name: 'Rød karrypasta', amount: '2', unit: 'spsk' },
      { name: 'Jasminris', amount: '300', unit: 'g' },
    ],
    instructions: [
      'Kog risen efter anvisning',
      'Steg grøntsagerne i wok',
      'Tilsæt karrypasta og kokosmælk',
      'Tilsæt rejer og lad simre',
      'Server med ris',
    ],
    tags: ['thai', 'seafood', 'wok'],
  },
  {
    id: '3',
    title: 'Klassisk Lasagne',
    description: 'Hjemmelavet italiensk lasagne med kødsauce og cremet bechamel',
    image_url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800',
    prep_time: 30,
    cook_time: 45,
    servings: 6,
    calories: 650,
    protein: 38,
    carbs: 52,
    fat: 32,
    ingredients: [
      { name: 'Hakket oksekød', amount: '500', unit: 'g' },
      { name: 'Lasagneplader', amount: '250', unit: 'g' },
      { name: 'Tomat passata', amount: '500', unit: 'ml' },
      { name: 'Mozzarella', amount: '200', unit: 'g' },
      { name: 'Bechamelsauce', amount: '5', unit: 'dl' },
    ],
    instructions: [
      'Lav kødsaucen',
      'Lav bechamelsaucen',
      'Lag lasagne, sauce og ost',
      'Bag i ovnen ved 180°C i 45 min',
      'Lad hvile 10 min før servering',
    ],
    tags: ['italiensk', 'comfort food', 'ovnret'],
  },
  {
    id: '4',
    title: 'Sprød Laksesalat',
    description: 'Frisk og sund salat med ovnbagt laks og avocado',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    prep_time: 15,
    cook_time: 20,
    servings: 2,
    calories: 420,
    protein: 32,
    carbs: 18,
    fat: 28,
    ingredients: [
      { name: 'Laksefilet', amount: '300', unit: 'g' },
      { name: 'Blandet salat', amount: '200', unit: 'g' },
      { name: 'Avocado', amount: '1', unit: 'stk' },
      { name: 'Cherrytomater', amount: '150', unit: 'g' },
      { name: 'Citron', amount: '1', unit: 'stk' },
    ],
    instructions: [
      'Bag laksen i ovnen',
      'Anret salaten',
      'Skær avocado og tomater',
      'Placer laks på salat',
      'Dryp med citron og olivenolie',
    ],
    tags: ['sund', 'laks', 'salat'],
  },
  {
    id: '5',
    title: 'Vegansk Buddha Bowl',
    description: 'Farverig og nærende skål fyldt med grøntsager og quinoa',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    prep_time: 20,
    cook_time: 25,
    servings: 2,
    calories: 380,
    protein: 14,
    carbs: 52,
    fat: 14,
    ingredients: [
      { name: 'Quinoa', amount: '200', unit: 'g' },
      { name: 'Kikærter', amount: '400', unit: 'g' },
      { name: 'Søde kartofler', amount: '300', unit: 'g' },
      { name: 'Spinat', amount: '100', unit: 'g' },
      { name: 'Tahini', amount: '4', unit: 'spsk' },
    ],
    instructions: [
      'Kog quinoa',
      'Bag søde kartofler og kikærter',
      'Anret quinoa i skåle',
      'Top med grøntsager',
      'Dryp med tahini dressing',
    ],
    tags: ['vegansk', 'sund', 'bowl'],
  },
];

interface RecipeState {
  recipes: Recipe[];
  currentIndex: number;
  swipes: Swipe[];
  likedRecipes: Recipe[];
  isLoading: boolean;
  setRecipes: (recipes: Recipe[]) => void;
  swipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  getCurrentRecipe: () => Recipe | null;
  reset: () => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: mockRecipes,
  currentIndex: 0,
  swipes: [],
  likedRecipes: [],
  isLoading: false,
  setRecipes: (recipes) => set({ recipes }),
  swipe: (direction) => {
    const { recipes, currentIndex, swipes, likedRecipes } = get();
    const currentRecipe = recipes[currentIndex];
    
    if (!currentRecipe) return;
    
    const newSwipe: Swipe = {
      id: Date.now().toString(),
      user_id: '',
      recipe_id: currentRecipe.id,
      direction,
      created_at: new Date().toISOString(),
    };
    
    const newLikedRecipes = direction === 'right' || direction === 'up'
      ? [...likedRecipes, currentRecipe]
      : likedRecipes;
    
    set({
      currentIndex: currentIndex + 1,
      swipes: [...swipes, newSwipe],
      likedRecipes: newLikedRecipes,
    });
  },
  getCurrentRecipe: () => {
    const { recipes, currentIndex } = get();
    return recipes[currentIndex] || null;
  },
  reset: () => set({ currentIndex: 0, swipes: [], likedRecipes: [] }),
}));
