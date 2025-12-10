import { useState } from 'react';
import { Check, Plus, Trash2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';

interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  checked: boolean;
  price?: number;
  offerPrice?: number;
  store?: string;
}

// Mock shopping list data
const mockItems: ShoppingItem[] = [
  { id: '1', name: 'Kyllingebryst', amount: '800', unit: 'g', checked: false, price: 65, offerPrice: 45, store: 'Føtex' },
  { id: '2', name: 'Pasta', amount: '500', unit: 'g', checked: false, price: 12 },
  { id: '3', name: 'Fløde', amount: '4', unit: 'dl', checked: false, price: 18 },
  { id: '4', name: 'Parmesan', amount: '100', unit: 'g', checked: true, price: 35 },
  { id: '5', name: 'Hvidløg', amount: '6', unit: 'fed', checked: false, price: 8 },
  { id: '6', name: 'Rejer', amount: '400', unit: 'g', checked: false, price: 55, offerPrice: 39, store: 'Netto' },
  { id: '7', name: 'Kokosmælk', amount: '4', unit: 'dl', checked: false, price: 15 },
  { id: '8', name: 'Rød karrypasta', amount: '1', unit: 'glas', checked: false, price: 25 },
  { id: '9', name: 'Jasminris', amount: '500', unit: 'g', checked: false, price: 20 },
  { id: '10', name: 'Wok-grøntsager', amount: '500', unit: 'g', checked: false, price: 30, offerPrice: 22, store: 'Rema' },
];

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(mockItems);

  const toggleItem = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const uncheckedItems = items.filter(item => !item.checked);
  const checkedItems = items.filter(item => item.checked);

  const totalPrice = items.reduce((sum, item) => sum + (item.offerPrice || item.price || 0), 0);
  const totalSavings = items.reduce((sum, item) => {
    if (item.offerPrice && item.price) {
      return sum + (item.price - item.offerPrice);
    }
    return sum;
  }, 0);

  const offerItems = items.filter(item => item.offerPrice);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Indkøbsliste</h1>
            <Badge variant="secondary">
              {uncheckedItems.length} varer
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pt-6">
        {/* Summary card */}
        <Card className="mb-6 bg-gradient-primary text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Estimeret total</p>
                <p className="text-3xl font-bold">{totalPrice} kr</p>
              </div>
              {totalSavings > 0 && (
                <div className="text-right">
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                    Spar {totalSavings} kr
                  </Badge>
                  <p className="text-xs opacity-75 mt-1">{offerItems.length} tilbudsvarer</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Offers section */}
        {offerItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Tilbud denne uge</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {offerItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {item.store}
                      </Badge>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{item.offerPrice} kr</span>
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        {item.price} kr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unchecked items */}
        {uncheckedItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">At købe</h2>
            <div className="space-y-2">
              {uncheckedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center transition-all hover:bg-primary/10"
                  >
                  </button>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} {item.unit}
                    </p>
                  </div>
                  <span className="font-medium">
                    {item.offerPrice || item.price} kr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checked items */}
        {checkedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Købt</h2>
            <div className="space-y-2">
              {checkedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground line-through">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} {item.unit}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold mb-2">Indkøbslisten er tom</h2>
            <p className="text-muted-foreground">
              Generer en liste fra din madplan
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
