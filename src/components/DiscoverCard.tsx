import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiscoverRecipe, Rating } from '@/hooks/useDiscover';

interface DiscoverCardProps {
  recipe: DiscoverRecipe;
  onRate: (rating: Rating) => void;
}

const SWIPE_THRESHOLD = 100;

export function DiscoverCard({ recipe, onRate }: DiscoverCardProps) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (clientX: number, clientY: number) => {
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragStart) return;
    setDragOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    if (!dragStart) return;

    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      if (absX > absY) {
        // Horizontal swipe
        onRate(dragOffset.x > 0 ? 'like' : 'dislike');
      } else {
        // Vertical swipe
        onRate(dragOffset.y < 0 ? 'love' : 'hate');
      }
    }

    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const getTransformStyle = () => {
    if (!dragStart) return {};
    const rotation = dragOffset.x * 0.05;
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
      transition: 'none',
    };
  };

  const getOverlayType = (): Rating | null => {
    if (!dragStart) return null;
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    if (absX < 30 && absY < 30) return null;
    
    if (absX > absY) {
      return dragOffset.x > 0 ? 'like' : 'dislike';
    } else {
      return dragOffset.y < 0 ? 'love' : 'hate';
    }
  };

  const overlayType = getOverlayType();

  const overlayConfig: Record<Rating, { text: string; emoji: string; bg: string; border: string }> = {
    love: { text: 'LIVRET!', emoji: '🔥', bg: 'bg-pink-500/30', border: 'border-pink-500' },
    like: { text: 'Fint nok', emoji: '👍', bg: 'bg-green-500/30', border: 'border-green-500' },
    dislike: { text: 'Ikke fan', emoji: '👎', bg: 'bg-orange-500/30', border: 'border-orange-500' },
    hate: { text: 'ALDRIG!', emoji: '🤮', bg: 'bg-red-500/30', border: 'border-red-500' },
  };

  // Generer placeholder billede baseret på titel
  const imageUrl = recipe.image_url || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80`;

  return (
    <Card
      className={cn(
        "relative w-full aspect-[3/4] overflow-hidden rounded-3xl cursor-grab active:cursor-grabbing",
        "shadow-2xl border-2 border-border/50",
        overlayType && overlayConfig[overlayType].border
      )}
      style={getTransformStyle()}
      onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleDragEnd}
    >
      {/* Baggrundsbillede */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Swipe overlay */}
      {overlayType && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          overlayConfig[overlayType].bg
        )}>
          <div className={cn(
            "text-center p-6 rounded-2xl border-4",
            overlayConfig[overlayType].border,
            "bg-background/90 backdrop-blur-sm"
          )}>
            <span className="text-6xl">{overlayConfig[overlayType].emoji}</span>
            <p className="text-2xl font-bold mt-2">{overlayConfig[overlayType].text}</p>
          </div>
        </div>
      )}

      {/* Indhold */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/20 text-white border-0 backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Titel */}
        <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">{recipe.title}</h2>
        
        {/* Beskrivelse */}
        {recipe.description && (
          <p className="text-lg text-white/90 line-clamp-2">{recipe.description}</p>
        )}

        {/* Nøgleingredienser */}
        {recipe.key_ingredients && recipe.key_ingredients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.key_ingredients.slice(0, 5).map((ing) => (
              <span
                key={ing}
                className="text-sm bg-white/10 px-2 py-0.5 rounded-full"
              >
                {ing}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
