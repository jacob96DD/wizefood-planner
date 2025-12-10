import { X, Heart, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SwipeActionsProps {
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

export function SwipeActions({ onSwipe }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <Button
        variant="swipe"
        size="icon-lg"
        className="bg-card text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => onSwipe('left')}
      >
        <X className="w-7 h-7" />
      </Button>
      
      <Button
        variant="swipe"
        size="icon-lg"
        className="bg-card text-muted-foreground hover:bg-muted"
        onClick={() => onSwipe('down')}
      >
        <ChevronDown className="w-7 h-7" />
      </Button>
      
      <Button
        variant="swipe"
        size="icon-lg"
        className="bg-card text-warning hover:bg-warning hover:text-warning-foreground"
        onClick={() => onSwipe('up')}
      >
        <Star className="w-7 h-7" />
      </Button>
      
      <Button
        variant="swipe"
        size="icon-lg"
        className="bg-card text-success hover:bg-success hover:text-success-foreground"
        onClick={() => onSwipe('right')}
      >
        <Heart className="w-7 h-7" />
      </Button>
    </div>
  );
}
