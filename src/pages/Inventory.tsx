import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog';
import { FridgeScanner } from '@/components/FridgeScanner';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { format, differenceInDays } from 'date-fns';
import { da } from 'date-fns/locale';

export default function Inventory() {
  const { t } = useTranslation();
  const { items, loading, expiringItems, deleteItem, markDepleted, refetch } = useInventory();

  // Sort items by expiry date (soonest first), then by name
  const sortedItems = [...items].sort((a, b) => {
    if (a.expires_at && b.expires_at) {
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    }
    if (a.expires_at) return -1;
    if (b.expires_at) return 1;
    return a.ingredient_name.localeCompare(b.ingredient_name);
  });

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expires_at) return null;
    const daysUntilExpiry = differenceInDays(new Date(item.expires_at), new Date());
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'expiring';
    return 'ok';
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
            <AddInventoryItemDialog onSuccess={refetch} />
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

        {/* Scan button */}
        <FridgeScanner onComplete={refetch} />

        {/* Items list */}
        {sortedItems.length > 0 ? (
          <div className="space-y-2">
            {sortedItems.map(item => {
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
                    <div className="flex items-center gap-2">
                       <p className="font-medium truncate">{item.ingredient_name}</p>
                     </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item.quantity && (
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                      )}
                      {item.expires_at && (
                        <>
                          {item.quantity && <span>•</span>}
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
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('inventory.empty')}</h2>
            <p className="text-muted-foreground mb-6 max-w-xs">{t('inventory.emptyDescription')}</p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
