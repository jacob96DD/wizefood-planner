import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Trash2, Store, Calendar, ShoppingBag, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useOffers, type Offer } from '@/hooks/useOffers';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { da } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog';
import { FridgeScanner } from '@/components/FridgeScanner';

export default function Shopping() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shoppingDate, setShoppingDate] = useState<Date>(new Date());
  
  // Shopping list hooks
  const { shoppingList, loading: listLoading, toggleItem, removeItem, clearList } = useShoppingList();
  const { offers, loading: offersLoading } = useOffers(shoppingDate);
  
  // Inventory hooks
  const { items: inventoryItems, loading: inventoryLoading, expiringItems, deleteItem, markDepleted, addItem: addToInventory, refetch: refetchInventory } = useInventory();

  const items = shoppingList?.items || [];
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
  const activeOffers = offers.slice(0, 5);

  // Inventory sorting and expiry
  const sortedInventoryItems = [...inventoryItems].sort((a, b) => {
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

  const loading = listLoading || offersLoading || inventoryLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold">{t('shopping.title')}</h1>
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
          <h1 className="text-xl font-bold">{t('shopping.title')}</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">🛒 {t('shopping.shoppingList', 'Indkøbsliste')}</TabsTrigger>
            <TabsTrigger value="inventory">📦 {t('inventory.title', 'Mit køkken')}</TabsTrigger>
          </TabsList>

          {/* Shopping List Tab */}
          <TabsContent value="list" className="space-y-4">
            {/* Shopping date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('shopping.shoppingDate')}: {format(shoppingDate, 'EEEE d. MMMM', { locale: da })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={shoppingDate}
                  onSelect={(date) => date && setShoppingDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {items.length > 0 ? (
              <>
                {/* Summary card */}
                <Card className="bg-gradient-primary text-primary-foreground">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">{t('shopping.estimatedTotal')}</p>
                        <p className="text-3xl font-bold">{totalPrice} {t('common.kr')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalSavings > 0 && (
                          <div className="text-right">
                            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                              {t('shopping.save', { amount: totalSavings })}
                            </Badge>
                            <p className="text-xs opacity-75 mt-1">{offerItems.length} {t('shopping.offerItems')}</p>
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                          onClick={() => {
                            clearList();
                            toast({
                              title: t('shopping.listCleared', 'Liste ryddet'),
                              description: t('shopping.listClearedDesc', 'Din indkøbsliste er blevet slettet'),
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Unchecked items */}
                {uncheckedItems.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('shopping.toBuy')}</h2>
                    <div className="space-y-2">
                      {uncheckedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                        >
                          <button
                            onClick={async () => {
                              toggleItem(item.id);
                              const result = await addToInventory({
                                ingredient_name: item.name,
                                quantity: parseFloat(item.amount) || undefined,
                                unit: item.unit || undefined,
                              });
                              if (result) {
                                toast({
                                  title: t('inventory.addedToInventory'),
                                  description: item.name,
                                });
                              }
                            }}
                            className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center transition-all hover:bg-primary/10"
                          >
                          </button>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.amount} {item.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.offerPrice ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1 py-0">
                                  {item.store || 'Tilbud'}
                                </Badge>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {item.offerPrice} {t('common.kr')}
                                </span>
                                {item.price && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {item.price}
                                  </span>
                                )}
                              </div>
                            ) : item.price ? (
                              <span className={`text-sm ${item.isEstimate ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                                {item.isEstimate ? 'ca. ' : ''}{item.price} {t('common.kr')}
                              </span>
                            ) : null}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checked items */}
                {checkedItems.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('shopping.bought')}</h2>
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-xl font-bold mb-2">{t('shopping.emptyList')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('shopping.generateFromPlan')}
                </p>
                <Button variant="default" onClick={() => navigate('/meal-plan')}>
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {t('shopping.goToMealPlan')}
                </Button>

                {/* Aktuelle tilbud */}
                {activeOffers.length > 0 && (
                  <Card className="mt-6 w-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">{t('shopping.currentOffers')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {activeOffers.map((offer: Offer) => (
                          <div
                            key={offer.id}
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {offer.chain_name}
                              </Badge>
                              <div>
                                <span className="font-medium">
                                  {offer.product_name || offer.offer_text?.split(' - ')[0] || 'Produkt'}
                                </span>
                                {offer.brand && (
                                  <span className="text-sm text-muted-foreground ml-2">{offer.brand}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary">{offer.offer_price_dkk} {t('common.kr')}</span>
                              {offer.original_price_dkk && (
                                <span className="text-sm text-muted-foreground line-through ml-2">
                                  {offer.original_price_dkk} {t('common.kr')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {/* Header actions */}
            <div className="flex items-center justify-end">
              <AddInventoryItemDialog onSuccess={refetchInventory} />
            </div>

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
            <FridgeScanner onComplete={refetchInventory} />

            {/* Items list */}
            {sortedInventoryItems.length > 0 ? (
              <div className="space-y-2">
                {sortedInventoryItems.map(item => {
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
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}
