import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Bell } from 'lucide-react';
import { usePantryStaples } from '@/hooks/usePantryStaples';

export const PantryStapleOffersAlert = () => {
  const { t } = useTranslation();
  const { stapleOffers, loading } = usePantryStaples();

  if (loading || stapleOffers.length === 0) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
          <CardTitle className="text-base text-green-800 dark:text-green-200">
            Tilbud på basislager!
          </CardTitle>
        </div>
        <p className="text-xs text-green-700 dark:text-green-300">
          Godt tidspunkt at fylde lageret op
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {stapleOffers.slice(0, 5).map(({ staple, offer }) => (
            <div 
              key={offer.id} 
              className="flex justify-between items-center py-1.5 border-b border-green-200 dark:border-green-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{staple.icon}</span>
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {offer.product_name}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {staple.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <Store className="w-3 h-3 mr-1" />
                  {offer.chain_name}
                </Badge>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-800 dark:text-green-200">
                    {offer.offer_price_dkk} kr
                  </p>
                  {offer.original_price_dkk && (
                    <p className="text-xs text-green-600 dark:text-green-400 line-through">
                      {offer.original_price_dkk} kr
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {stapleOffers.length > 5 && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
            +{stapleOffers.length - 5} flere tilbud
          </p>
        )}
      </CardContent>
    </Card>
  );
};
