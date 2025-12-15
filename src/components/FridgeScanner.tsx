import { useState, useRef } from 'react';
import { Camera, Plus, Loader2, Check, X, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useFridgeScanner, type DetectedIngredient } from '@/hooks/useFridgeScanner';

interface FridgeScannerProps {
  onComplete?: () => void;
}

export function FridgeScanner({ onComplete }: FridgeScannerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  
  const { 
    scanning, 
    detectedIngredients, 
    scanFridgePhoto, 
    addToInventory,
    clearDetected 
  } = useFridgeScanner();

  // Handle multiple file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setPreviews(prev => [...prev, base64]);
        
        // Scan with default category (pantry)
        const ingredients = await scanFridgePhoto(base64, 'pantry');
        
        // Select all high/medium confidence ingredients by default
        const highConfidence = new Set<number>();
        const startIdx = detectedIngredients.length;
        ingredients.forEach((ing, idx) => {
          if (ing.confidence === 'high' || ing.confidence === 'medium') {
            highConfidence.add(startIdx + idx);
          }
        });
        setSelectedIngredients(prev => new Set([...prev, ...highConfidence]));
      };
      reader.readAsDataURL(file);
    }
    
    // Reset file input for next selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleIngredient = (index: number) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const selected = detectedIngredients.filter((_, idx) => selectedIngredients.has(idx));
    if (selected.length > 0) {
      const success = await addToInventory(selected);
      if (success) {
        setPreviews([]);
        setSelectedIngredients(new Set());
        onComplete?.();
      }
    }
  };

  const handleReset = () => {
    setPreviews([]);
    setSelectedIngredients(new Set());
    clearDetected();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceBadge = (confidence: DetectedIngredient['confidence']) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="text-xs bg-green-500">Sikker</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Sandsynlig</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Usikker</Badge>;
    }
  };

  const getCategoryEmoji = (category: DetectedIngredient['category']) => {
    switch (category) {
      case 'fridge': return '🧊';
      case 'freezer': return '❄️';
      case 'pantry': return '🗄️';
    }
  };

  const buttonLabel = t('inventory.scanItems', '📸 Send billede af dine varer');

  // Show scanner button if no image yet
  if (previews.length === 0 && detectedIngredients.length === 0) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          variant="outline"
          className="w-full h-16 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyserer...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              {buttonLabel}
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          {t('inventory.scanHint', 'Tag ét eller flere billeder - vi finder ingredienserne automatisk')}
        </p>
      </div>
    );
  }

  // Show scanning state
  if (scanning && previews.length > 0 && detectedIngredients.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex gap-2 overflow-x-auto mb-4">
            {previews.map((preview, idx) => (
              <img 
                key={idx}
                src={preview} 
                alt={`Billede ${idx + 1}`}
                className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('inventory.analyzing', 'AI analyserer dine varer...')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show results
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Image previews */}
        <div className="flex gap-2 overflow-x-auto">
          {previews.map((preview, idx) => (
            <img 
              key={idx}
              src={preview} 
              alt={`Billede ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
          {/* Add more photos button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors flex-shrink-0"
          >
            {scanning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-xs mt-1">Tilføj</span>
              </>
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Fundet {detectedIngredients.length} ingredienser
          </p>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <Trash2 className="w-4 h-4 mr-1" />
            Nulstil
          </Button>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2">
          {detectedIngredients.map((ing, idx) => (
            <div 
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                selectedIngredients.has(idx) ? 'bg-primary/10' : 'bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selectedIngredients.has(idx)}
                onCheckedChange={() => toggleIngredient(idx)}
              />
              <span className="text-lg">{getCategoryEmoji(ing.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ing.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {ing.quantity && (
                    <span>{ing.quantity} {ing.unit || 'stk'}</span>
                  )}
                  {ing.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ing.expires_at}
                    </span>
                  )}
                </div>
              </div>
              {getConfidenceBadge(ing.confidence)}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <X className="w-4 h-4 mr-1" />
            Annuller
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={selectedIngredients.size === 0}
          >
            <Check className="w-4 h-4 mr-1" />
            Tilføj {selectedIngredients.size} varer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
