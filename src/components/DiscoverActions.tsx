import { Button } from '@/components/ui/button';
import type { Rating } from '@/hooks/useDiscover';

interface DiscoverActionsProps {
  onRate: (rating: Rating) => void;
}

export function DiscoverActions({ onRate }: DiscoverActionsProps) {
  const actions: { rating: Rating; emoji: string; label: string; colors: string }[] = [
    {
      rating: 'hate',
      emoji: '🤮',
      label: 'Aldrig!',
      colors: 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white',
    },
    {
      rating: 'dislike',
      emoji: '👎',
      label: 'Ikke fan',
      colors: 'bg-orange-500/10 border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white',
    },
    {
      rating: 'like',
      emoji: '👍',
      label: 'Fint nok',
      colors: 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white',
    },
    {
      rating: 'love',
      emoji: '🔥',
      label: 'Livret!',
      colors: 'bg-pink-500/10 border-pink-500/50 text-pink-500 hover:bg-pink-500 hover:text-white',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-6">
      {actions.map(({ rating, emoji, label, colors }) => (
        <Button
          key={rating}
          variant="outline"
          onClick={() => onRate(rating)}
          className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all ${colors}`}
        >
          <span className="text-2xl mb-1">{emoji}</span>
          <span className="text-xs font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
}
