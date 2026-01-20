'use client';

import { useFavoritesStore, FavoriteWinery } from '@/lib/stores/favorites';
import { useCallback, useState, useEffect } from 'react';

interface FavoriteButtonProps {
  winery: {
    id: number;
    name: string;
    slug: string;
    region?: string;
    image_url?: string;
    tasting_fee?: number;
  };
  source?: 'grid' | 'detail' | 'ai-recommendation';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function FavoriteButton({
  winery,
  source = 'grid',
  size = 'md',
  showLabel = false,
  className = ''
}: FavoriteButtonProps) {
  const { toggleFavorite, isHydrated } = useFavoritesStore();
  const isFavorite = useFavoritesStore(state => state.favorites.some(f => f.id === winery.id));
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    toggleFavorite({
      id: winery.id,
      name: winery.name,
      slug: winery.slug,
      region: winery.region,
      image_url: winery.image_url,
      tasting_fee: winery.tasting_fee,
      source,
    });
  }, [winery, source, toggleFavorite]);

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <button
        className={`${sizeClasses[size]} ${className} opacity-50`}
        disabled
        aria-label="Loading favorites"
      >
        <HeartIcon filled={false} size={size} />
        {showLabel && <span className="ml-1.5">Save</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        ${isFavorite
          ? 'text-red-500 hover:text-red-600'
          : 'text-stone-400 hover:text-red-400'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 rounded-full
        ${className}
      `}
      aria-label={isFavorite ? `Remove ${winery.name} from favorites` : `Add ${winery.name} to favorites`}
      title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
    >
      <HeartIcon filled={isFavorite} size={size} />
      {showLabel && (
        <span className="ml-1.5">
          {isFavorite ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
}

const sizeClasses = {
  sm: 'p-1 flex items-center text-xs',
  md: 'p-1.5 flex items-center text-sm',
  lg: 'p-2 flex items-center text-base',
};

function HeartIcon({ filled, size }: { filled: boolean; size: 'sm' | 'md' | 'lg' }) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (filled) {
    return (
      <svg
        className={iconSizes[size]}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  return (
    <svg
      className={iconSizes[size]}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

// Compact heart badge for grid cards
export function FavoriteButtonCompact({ winery, source = 'grid' }: Pick<FavoriteButtonProps, 'winery' | 'source'>) {
  const { toggleFavorite, isHydrated } = useFavoritesStore();
  const isFavorite = useFavoritesStore(state => state.favorites.some(f => f.id === winery.id));
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    toggleFavorite({
      id: winery.id,
      name: winery.name,
      slug: winery.slug,
      region: winery.region,
      image_url: winery.image_url,
      tasting_fee: winery.tasting_fee,
      source,
    });
  }, [winery, source, toggleFavorite]);

  if (!isHydrated) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={`
        absolute bottom-3 right-3 z-10
        p-2 rounded-full shadow-lg
        ${isFavorite
          ? 'bg-red-500 text-white'
          : 'bg-white/90 text-stone-500 hover:text-red-500 hover:bg-white'
        }
        ${isAnimating ? 'scale-110' : 'scale-100'}
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-red-300
      `}
      aria-label={isFavorite ? `Remove ${winery.name} from favorites` : `Add ${winery.name} to favorites`}
    >
      <HeartIcon filled={isFavorite} size="sm" />
    </button>
  );
}
