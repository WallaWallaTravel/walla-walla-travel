'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePageContextStore } from '@/lib/stores/pageContext';
import { useAnalyticsStore } from '@/lib/stores/analytics-simple';

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
}

export default function WineriesPage() {
  const setDirectoryContext = usePageContextStore((state) => state.setDirectoryContext);
  const analytics = useAnalyticsStore();
  const [filter, setFilter] = useState<'all' | 'reservation' | 'walk-in'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [wineries, setWineries] = useState<WinerySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set page context for the chat widget
  useEffect(() => {
    setDirectoryContext({ category: 'wineries' });
  }, [setDirectoryContext]);

  // Track filter changes
  const handleFilterChange = useCallback((newFilter: typeof filter) => {
    setFilter(newFilter);
    if (newFilter !== 'all') {
      analytics.trackFilterApplied('reservation', newFilter);
    }
  }, [analytics]);

  // Track search with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        analytics.trackSearch(searchQuery, 'wineries', wineries.length);
      }, 1000);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, wineries.length, analytics]);

  // Fetch wineries from API
  const fetchWineries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filter === 'reservation') params.set('reservation', 'true');
      if (filter === 'walk-in') params.set('reservation', 'false');

      const response = await fetch(`/api/wineries?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setWineries(data.data);
      } else {
        // Handle error - could be string or object
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || 'Failed to load wineries';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching wineries:', err);
      setError('Failed to load wineries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    fetchWineries();
  }, [fetchWineries]);

  // Client-side filtering for instant feedback
  const filteredWineries = wineries.filter((winery) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      winery.name.toLowerCase().includes(query) ||
      winery.description?.toLowerCase().includes(query) ||
      winery.wine_styles?.some(style => style.toLowerCase().includes(query)) ||
      winery.region?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Hero Section - Darker, more sophisticated */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Walla Walla Wineries
          </h1>
          <p className="text-xl text-stone-300 max-w-2xl">
            Discover over 120 wineries in Washington&apos;s premier wine region. 
            From historic estates to boutique tasting rooms, find your perfect pour.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="What kind of wine experience are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Wineries' },
              { value: 'walk-in', label: 'Walk-in Welcome' },
              { value: 'reservation', label: 'Reservation Required' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value as typeof filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <p className="text-stone-600 mb-6">
          {isLoading ? 'Loading...' : `Showing ${filteredWineries.length} winer${filteredWineries.length !== 1 ? 'ies' : 'y'}`}
        </p>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Winery Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWineries.map((winery) => (
              <Link
                key={winery.id}
                href={`/wineries/${winery.slug}`}
                className="group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                  {winery.image_url ? (
                    <img src={winery.image_url} alt={winery.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🍷</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-stone-900 group-hover:text-[#722F37] transition-colors">
                      {winery.name}
                    </h3>
                    {winery.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <span>★</span>
                        <span className="text-sm font-medium">{winery.rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                    {winery.description}
                  </p>

                  {/* Wine Styles */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {winery.wine_styles?.slice(0, 3).map((style) => (
                      <span
                        key={style}
                        className="px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded-full"
                      >
                        {style}
                      </span>
                    ))}
                    {(winery.wine_styles?.length || 0) > 3 && (
                      <span className="px-2 py-1 text-stone-500 text-xs">
                        +{(winery.wine_styles?.length || 0) - 3} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">
                      {winery.tasting_fee > 0 ? `$${winery.tasting_fee} tasting` : 'By appointment'}
                    </span>
                    {winery.reservation_required && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
                        Reservation Required
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredWineries.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">No wineries found</h3>
            <p className="text-stone-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

