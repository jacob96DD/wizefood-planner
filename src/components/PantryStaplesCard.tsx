import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { usePantryStaples } from '@/hooks/usePantryStaples';

export const PantryStaplesCard = () => {
  const { t } = useTranslation();
  const { staples, loading, getStaplesByCategory, categoryLabels } = usePantryStaples();
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
          <p className="text-sm text-muted-foreground">Indlæser...</p>
        </CardContent>
      </Card>
    );
  }

  const groupedStaples = getStaplesByCategory();
  const categories = Object.keys(groupedStaples);

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
          <p className="text-xs text-muted-foreground mt-1">
            {staples.length} varer i dit basislager
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  {categoryLabels[category] || category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {groupedStaples[category].map((staple) => (
                    <Badge 
                      key={staple.id} 
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {staple.icon} {staple.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
