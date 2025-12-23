import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ChevronDown, ChevronUp, Store, Loader2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFoodwaste, type FoodwasteProduct } from '@/hooks/useFoodwaste';

interface FoodwasteSelectorProps {
  onSelectionChange?: (products: FoodwasteProduct[]) => void;
}

export function FoodwasteSelector({ onSelectionChange }: FoodwasteSelectorProps) {
  const navigate = useNavigate();
  const {
    products,
    selectedProducts,
    userStores,
    loading,
    toggleProduct,
    selectAll,
    clearAll,
    getSelectedProducts,
    hasStores
  } = useFoodwaste();

  const [expanded, setExpanded] = useState(false);

  const handleToggle = (productId: string) => {
    toggleProduct(productId);
    // Notify parent of change after state update
    setTimeout(() => {
      onSelectionChange?.(getSelectedProducts());
    }, 0);
  };

  const handleSelectAll = () => {
    selectAll();
    setTimeout(() => {
      onSelectionChange?.(getSelectedProducts());
    }, 0);
  };

  const handleClearAll = () => {
    clearAll();
    onSelectionChange?.([]);
  };

  const getBrandColor = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'netto': return 'bg-yellow-500';
      case 'foetex': return 'bg-red-500';
      case 'bilka': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Ingen butikker valgt
  if (!hasStores) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <Leaf className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-800 dark:text-green-200">Madspild fra Salling</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Vælg Netto, Føtex eller Bilka butikker for at se madspild produkter du kan bruge i din madplan.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/salling-stores')}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Vælg butikker
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Loading
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-green-600" />
          <span className="text-muted-foreground">Henter madspild...</span>
        </div>
      </Card>
    );
  }

  // Ingen produkter
  if (products.length === 0) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <Leaf className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Ingen madspild lige nu</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Der er ingen madspild produkter i dine valgte butikker lige nu. Prøv igen senere.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-green-200 dark:border-green-800">
      {/* Header */}
      <div
        className="p-4 bg-green-50 dark:bg-green-950/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            <span className="font-medium">Madspild</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {products.length} produkter
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {selectedProducts.size > 0 && (
              <Badge className="bg-green-600">
                {selectedProducts.size} valgt
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          Vælg produkter AI'en skal lave retter med
        </p>
      </div>

      {/* Collapsible content */}
      {expanded && (
        <>
          {/* Actions */}
          <div className="px-4 py-2 border-b flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Vælg alle
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Ryd valg
            </Button>
          </div>

          {/* Product list */}
          <div className="divide-y max-h-80 overflow-y-auto">
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              return (
                <div
                  key={product.id}
                  className={cn(
                    "p-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-green-50 dark:bg-green-950/20"
                  )}
                  onClick={() => handleToggle(product.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />

                  {/* Produkt billede */}
                  {product.product_image ? (
                    <img
                      src={product.product_image}
                      alt={product.product_description}
                      className="w-12 h-12 object-cover rounded shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center shrink-0">
                      <Leaf className="w-6 h-6 text-green-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs leading-tight line-clamp-2">
                      {product.product_description}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">
                        {product.brand}
                      </span>
                      <span className="text-xs font-bold text-green-600">
                        {product.new_price} kr
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {product.original_price} kr
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-green-100 text-green-800">
                        -{Math.round(product.percent_discount)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
