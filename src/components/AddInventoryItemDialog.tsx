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

interface AddInventoryItemDialogProps {
  trigger?: React.ReactNode;
  defaultName?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  onSuccess?: () => void;
}

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
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await addItem({
      ingredient_name: name.trim(),
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit || undefined,
      category,
      expires_at: expiresAt || undefined,
    });

    if (result) {
      setOpen(false);
      setName('');
      setQuantity('');
      setUnit('');
      setCategory('pantry');
      setExpiresAt('');
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
            <Label htmlFor="expires">{t('inventory.expiresAt')}</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
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
