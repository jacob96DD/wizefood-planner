import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Refrigerator, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog';
import { FridgeScanner } from '@/components/FridgeScanner';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { format, differenceInDays } from 'date-fns';
import { da } from 'date-fns/locale';

export default function Inventory() {
  const { t } = useTranslation();
  const { items, loading, expiringItems, deleteItem, markDepleted, refetch } = useInventory();
  const [activeTab, setActiveTab] = useState<'fridge' | 'pantry'>('fridge');

  // Group items: fridge+freezer -> "fridge", pantry -> "pantry"
  const fridgeItems = items.filter(item => item.category === 'fridge' || item.category === 'freezer');
  const pantryItems = items.filter(item => item.category === 'pantry');

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expires_at) return null;
    const daysUntilExpiry = differenceInDays(new Date(item.expires_at), new Date());
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'expiring';
    return 'ok';
  };

  const renderItemList = (itemsList: InventoryItem[]) => {
    if (itemsList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-muted-foreground text-sm">{t('inventory.emptyDescription')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {itemsList.map(item => {
          const expiryStatus = getExpiryStatus(item);

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                expiryStatus === 'expired'
                  ? 'bg-destructive/10 border-destructive/30'
                  : expiryStatus === 'expiring'
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.ingredient_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {item.quantity && (
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                  )}
                  {item.expires_at && (
                    <>
                      <span>•</span>
                      <span className={expiryStatus === 'expired' ? 'text-destructive' : expiryStatus === 'expiring' ? 'text-amber-600' : ''}>
                        {format(new Date(item.expires_at), 'd. MMM', { locale: da })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => markDepleted(item.id)}
                  title={t('inventory.markUsed')}
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold">{t('inventory.title')}</h1>
          </div>
        </header>
        <main className="px-4 pt-6 flex justify-center">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{t('inventory.title')}</h1>
            <AddInventoryItemDialog />
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Expiring items warning */}
        {expiringItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                  {t('inventory.expiringWarning', { count: expiringItems.length })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {expiringItems.map(item => (
                  <Badge key={item.id} variant="outline" className="text-amber-700 border-amber-300">
                    {item.ingredient_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Køleskab / Kolonial */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fridge' | 'pantry')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fridge" className="flex items-center gap-2">
              <Refrigerator className="w-4 h-4" />
              {t('inventory.tabs.fridge')}
              {fridgeItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {fridgeItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pantry" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('inventory.tabs.pantry')}
              {pantryItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {pantryItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fridge" className="mt-4 space-y-4">
            <FridgeScanner 
              onComplete={refetch} 
              scanType="fridge"
            />
            {renderItemList(fridgeItems)}
          </TabsContent>

          <TabsContent value="pantry" className="mt-4 space-y-4">
            <FridgeScanner 
              onComplete={refetch} 
              scanType="pantry"
            />
            {renderItemList(pantryItems)}
          </TabsContent>
        </Tabs>

        {/* Empty state - only show if both tabs empty */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h2 className="text-xl font-bold mb-2">{t('inventory.empty')}</h2>
            <p className="text-muted-foreground mb-6">{t('inventory.emptyDescription')}</p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
