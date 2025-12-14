import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventory } from '@/hooks/useInventory';
import { addDays, format } from 'date-fns';

interface AddInventoryItemDialogProps {
  trigger?: React.ReactNode;
  defaultName?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  onSuccess?: () => void;
}

const quickExpiryOptions = [
  { label: 'I dag', days: 0 },
  { label: '+3 dage', days: 3 },
  { label: '+1 uge', days: 7 },
  { label: '+1 måned', days: 30 },
];

export function AddInventoryItemDialog({
  trigger,
  defaultName = '',
  defaultQuantity,
  defaultUnit = '',
  onSuccess,
}: AddInventoryItemDialogProps) {
  const { t } = useTranslation();
  const { addItem, saving } = useInventory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [quantity, setQuantity] = useState<string>(defaultQuantity?.toString() || '');
  const [unit, setUnit] = useState(defaultUnit);
  const [category, setCategory] = useState<'fridge' | 'freezer' | 'pantry'>('pantry');
  
  // Expiry date as separate fields
  const [expiryDay, setExpiryDay] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');

  const setQuickExpiry = (days: number) => {
    const date = addDays(new Date(), days);
    setExpiryDay(date.getDate().toString());
    setExpiryMonth((date.getMonth() + 1).toString());
    setExpiryYear(date.getFullYear().toString());
  };

  const getExpiryDate = (): string | undefined => {
    if (expiryDay && expiryMonth && expiryYear) {
      const day = expiryDay.padStart(2, '0');
      const month = expiryMonth.padStart(2, '0');
      return `${expiryYear}-${month}-${day}`;
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await addItem({
      ingredient_name: name.trim(),
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit || undefined,
      category,
      expires_at: getExpiryDate(),
    });

    if (result) {
      setOpen(false);
      setName('');
      setQuantity('');
      setUnit('');
      setCategory('pantry');
      setExpiryDay('');
      setExpiryMonth('');
      setExpiryYear('');
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('inventory.add')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inventory.addItem')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('inventory.ingredientName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inventory.ingredientPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('inventory.quantity')}</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('inventory.unit')}</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="stk, kg, l..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('inventory.category')}</Label>
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fridge">{t('inventory.categories.fridge')}</SelectItem>
                <SelectItem value="freezer">{t('inventory.categories.freezer')}</SelectItem>
                <SelectItem value="pantry">{t('inventory.categories.pantry')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('inventory.expiresAt')}</Label>
            
            {/* Quick expiry buttons */}
            <div className="flex gap-2 flex-wrap">
              {quickExpiryOptions.map((opt) => (
                <Button
                  key={opt.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickExpiry(opt.days)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            
            {/* Three separate fields for DD / MM / YYYY */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="DD"
                  value={expiryDay}
                  onChange={(e) => setExpiryDay(e.target.value.slice(0, 2))}
                  min={1}
                  max={31}
                  className="text-center"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="MM"
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value.slice(0, 2))}
                  min={1}
                  max={12}
                  className="text-center"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="ÅÅÅÅ"
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value.slice(0, 4))}
                  min={new Date().getFullYear()}
                  className="text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
