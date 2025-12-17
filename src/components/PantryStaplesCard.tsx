import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Package, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useBasislager } from '@/hooks/useBasislager';
import { Skeleton } from '@/components/ui/skeleton';

export const PantryStaplesCard = () => {
  const { t } = useTranslation();
  const { 
    items, 
    loading, 
    saving,
    error,
    toggleStock, 
    getItemsByCategory, 
    categoryLabels,
    missingCount,
    totalCount,
    refetch 
  } = useBasislager();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5" />
            Basislager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state with retry button
  if (error || (!loading && items.length === 0)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5" />
            📋 Basislager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {error || 'Kunne ikke hente basislager'}
            </p>
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Prøv igen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedItems = getItemsByCategory();
  const categories = Object.keys(groupedItems);
  const hasItems = items.length > 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5" />
                📋 Basislager - ting du altid bør have
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {hasItems ? (
                missingCount > 0 
                  ? `${totalCount - missingCount} af ${totalCount} varer på lager · ${missingCount} mangler`
                  : `${totalCount} varer på lager ✓`
              ) : 'Indlæser basislager...'}
            </p>
            <p className="text-xs text-muted-foreground">
              Est. forbrug: ~75 kr/md
            </p>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Tryk på en vare for at markere om du har den eller mangler den. 
              Manglende varer købes kun hvis der er tilbud.
            </p>
            
            {categories.map((category) => (
              <div key={category}>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  {categoryLabels[category] || category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {groupedItems[category].map((item) => (
                    <Badge 
                      key={item.id} 
                      variant={item.is_depleted ? "destructive" : "secondary"}
                      className={`text-xs font-normal cursor-pointer transition-colors ${
                        item.is_depleted 
                          ? 'hover:bg-destructive/80' 
                          : 'hover:bg-secondary/80'
                      } ${saving ? 'opacity-50' : ''}`}
                      onClick={() => !saving && toggleStock(item.id)}
                    >
                      {item.is_depleted ? (
                        <X className="w-3 h-3 mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {item.icon} {item.ingredient_name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}

            {missingCount > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  🛒 <strong>{missingCount} vare{missingCount > 1 ? 'r' : ''} mangler</strong> - 
                  tilføjes automatisk til indkøbslisten når der er tilbud.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
