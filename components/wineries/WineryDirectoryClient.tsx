'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WineryGrid } from './WineryGrid';
import { WineryFinderDrawer } from '@/components/ai/WineryFinderDrawer';
import { useFavoriteCount } from '@/lib/stores/favorites';

interface WinerySummary {
  id: number;
  name: string;
  slug: string;
  region: string;
  description: string;
  wine_styles: string[];
  tasting_fee: number;
  reservation_required: boolean;
  rating?: number;
  image_url?: string;
  experience_tags: string[];
  features: string[];
  max_group_size?: number;
  verified: boolean;
}

interface WineryDirectoryClientProps {
  wineries: WinerySummary[];
}

export function WineryDirectoryClient({ wineries }: WineryDirectoryClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const favoriteCount = useFavoriteCount();

  return (
    <>
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* AI Discovery Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8B1538] to-[#722F37] text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <span className="text-lg">🍷</span>
          <span>Ask AI to Find Wineries</span>
        </button>

        {/* Quick Links */}
        <div className="flex items-center gap-3">
          <Link
            href="/wineries/discover"
            className="text-sm text-stone-600 hover:text-[#8B1538] transition-colors"
          >
            Full AI Discovery →
          </Link>
          <Link
            href="/my-favorites"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Saved
            {favoriteCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {favoriteCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Winery Grid */}
      <WineryGrid initialWineries={wineries} />

      {/* AI Drawer */}
      <WineryFinderDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
