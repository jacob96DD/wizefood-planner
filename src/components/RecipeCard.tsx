import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Flame, Heart, X, Star, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface RecipeCardProps {
  recipe: Recipe;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

export function RecipeCard({ recipe, onSwipe }: RecipeCardProps) {
  const { t } = useTranslation();
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    setDragStart({ x: point.clientX, y: point.clientY });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const x = point.clientX - dragStart.x;
    const y = point.clientY - dragStart.y;
    setDragOffset({ x, y });
  };

  const handleDragEnd = () => {
    if (!dragStart) return;
    
    const threshold = 100;
    const { x, y } = dragOffset;
    
    if (Math.abs(x) > Math.abs(y)) {
      if (x > threshold) {
        setSwipeDirection('right');
        setTimeout(() => onSwipe('right'), 300);
      } else if (x < -threshold) {
        setSwipeDirection('left');
        setTimeout(() => onSwipe('left'), 300);
      }
    } else {
      if (y < -threshold) {
        setSwipeDirection('up');
        setTimeout(() => onSwipe('up'), 300);
      } else if (y > threshold) {
        setSwipeDirection('down');
        setTimeout(() => onSwipe('down'), 300);
      }
    }
    
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const getTransformStyle = () => {
    if (swipeDirection) return {};
    const rotation = dragOffset.x * 0.05;
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
    };
  };

  const getOverlayOpacity = () => {
    const threshold = 100;
    if (dragOffset.x > 30) return Math.min(dragOffset.x / threshold, 1);
    if (dragOffset.x < -30) return Math.min(-dragOffset.x / threshold, 1);
    if (dragOffset.y < -30) return Math.min(-dragOffset.y / threshold, 1);
    if (dragOffset.y > 30) return Math.min(dragOffset.y / threshold, 1);
    return 0;
  };

  const getOverlayType = () => {
    if (Math.abs(dragOffset.x) > Math.abs(dragOffset.y)) {
      return dragOffset.x > 0 ? 'like' : 'skip';
    }
    return dragOffset.y < 0 ? 'super' : 'never';
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative w-full max-w-sm mx-auto overflow-hidden cursor-grab active:cursor-grabbing select-none",
        "h-[70vh] max-h-[600px]",
        swipeDirection === 'right' && 'animate-swipe-right',
        swipeDirection === 'left' && 'animate-swipe-left',
        swipeDirection === 'up' && 'animate-swipe-up',
        swipeDirection === 'down' && 'animate-swipe-down'
      )}
      style={getTransformStyle()}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      {/* Image */}
      <div className="relative h-2/3">
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Swipe overlays */}
        {getOverlayOpacity() > 0 && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity",
              getOverlayType() === 'like' && 'bg-success/30',
              getOverlayType() === 'skip' && 'bg-destructive/30',
              getOverlayType() === 'super' && 'bg-warning/30',
              getOverlayType() === 'never' && 'bg-muted/50'
            )}
            style={{ opacity: getOverlayOpacity() }}
          >
            <div className="text-4xl font-bold text-card rotate-[-15deg] border-4 px-4 py-2 rounded-xl">
              {getOverlayType() === 'like' && t('recipe.swipe.yes')}
              {getOverlayType() === 'skip' && t('recipe.swipe.no')}
              {getOverlayType() === 'super' && t('recipe.swipe.super')}
              {getOverlayType() === 'never' && t('recipe.swipe.never')}
            </div>
          </div>
        )}
        
        {/* Tags */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {recipe.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-card/90 backdrop-blur-sm">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-card">
        <h2 className="text-xl font-bold mb-2">{recipe.title}</h2>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} {t('common.minutes')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} {t('common.persons')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Flame className="w-4 h-4" />
            <span>{recipe.calories} {t('common.kcal')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
