import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Trash2, Store, Calendar, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useOffers, type Offer } from '@/hooks/useOffers';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function ShoppingList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shoppingDate, setShoppingDate] = useState<Date>(new Date());
  const { shoppingList, loading, toggleItem, removeItem } = useShoppingList();
  const { offers, loading: offersLoading } = useOffers(shoppingDate);

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

  // Aktuelle tilbud fra foretrukne butikker
  const activeOffers = offers.slice(0, 5);

  if (loading || offersLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold">{t('shopping.title')}</h1>
          </div>
        </header>
        <main className="px-4 pt-6 flex justify-center">
          <div className="animate-pulse text-muted-foreground">Indlæser...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{t('shopping.title')}</h1>
            <Badge variant="secondary">
              {uncheckedItems.length} {t('shopping.items')}
            </Badge>
          </div>
          
          {/* Shopping date picker */}
          <div className="mt-3">
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
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pt-6">
        {items.length > 0 ? (
          <>
            {/* Summary card */}
            <Card className="mb-6 bg-gradient-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">{t('shopping.estimatedTotal')}</p>
                    <p className="text-3xl font-bold">{totalPrice} {t('common.kr')}</p>
                  </div>
                  {totalSavings > 0 && (
                    <div className="text-right">
                      <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                        {t('shopping.save', { amount: totalSavings })}
                      </Badge>
                      <p className="text-xs opacity-75 mt-1">{offerItems.length} {t('shopping.offerItems')}</p>
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
                    <CardTitle className="text-base">{t('shopping.offersThisWeek')}</CardTitle>
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
                          <span className="font-bold text-primary">{item.offerPrice} {t('common.kr')}</span>
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {item.price} {t('common.kr')}
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
                <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('shopping.toBuy')}</h2>
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
                        {item.offerPrice || item.price} {t('common.kr')}
                      </span>
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
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold mb-2">{t('shopping.emptyList')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('shopping.generateFromPlan')}
            </p>
            <Button variant="hero" onClick={() => navigate('/meal-plan')}>
              <ShoppingBag className="w-5 h-5 mr-2" />
              {t('shopping.goToMealPlan')}
            </Button>
          </div>
        )}

        {/* Aktuelle tilbud fra foretrukne butikker */}
        {items.length === 0 && activeOffers.length > 0 && (
          <Card className="mt-6">
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
                        <span className="font-medium">{offer.product_name}</span>
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
      </main>

      <BottomNavigation />
    </div>
  );
}
