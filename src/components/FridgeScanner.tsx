import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useFridgeScanner, type DetectedIngredient } from '@/hooks/useFridgeScanner';

interface FridgeScannerProps {
  onComplete?: () => void;
}

export function FridgeScanner({ onComplete }: FridgeScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  
  const { 
    scanning, 
    detectedIngredients, 
    scanFridgePhoto, 
    addToInventory,
    clearDetected 
  } = useFridgeScanner();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      
      // Scan the image
      const ingredients = await scanFridgePhoto(base64);
      
      // Select all high confidence ingredients by default
      const highConfidence = new Set<number>();
      ingredients.forEach((ing, idx) => {
        if (ing.confidence === 'high' || ing.confidence === 'medium') {
          highConfidence.add(idx);
        }
      });
      setSelectedIngredients(highConfidence);
    };
    reader.readAsDataURL(file);
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
        setPreview(null);
        setSelectedIngredients(new Set());
        onComplete?.();
      }
    }
  };

  const handleReset = () => {
    setPreview(null);
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

  // Show scanner button if no image yet
  if (!preview && detectedIngredients.length === 0) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          variant="outline"
          className="w-full h-20 border-dashed"
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
              📷 Scan køleskab
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Tag et billede af dit køleskab, så finder vi ingredienserne automatisk
        </p>
      </div>
    );
  }

  // Show scanning state
  if (scanning) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          {preview && (
            <img 
              src={preview} 
              alt="Køleskab" 
              className="w-full h-32 object-cover rounded-lg mb-4"
            />
          )}
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            AI analyserer dit køleskab...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show results
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {preview && (
          <img 
            src={preview} 
            alt="Køleskab" 
            className="w-full h-24 object-cover rounded-lg"
          />
        )}
        
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
                {ing.quantity && (
                  <p className="text-xs text-muted-foreground">
                    {ing.quantity} {ing.unit || 'stk'}
                  </p>
                )}
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
