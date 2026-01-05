'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePageContextStore } from '@/lib/stores/pageContext';
import { useAnalyticsStore } from '@/lib/stores/analytics-simple';
// EXPERIENCE_TAG_LABELS available for future use

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
  // Enhanced fields
  experience_tags?: string[];
  max_group_size?: number;
  verified?: boolean;
}

interface WineryGridProps {
  initialWineries: WinerySummary[];
}

// Experience tag options for filtering
const EXPERIENCE_TAG_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'intimate', label: 'Intimate', icon: '🤫' },
  { value: 'boutique', label: 'Boutique', icon: '💎' },
  { value: 'family-friendly', label: 'Family Friendly', icon: '👨‍👩‍👧' },
  { value: 'romantic', label: 'Romantic', icon: '💕' },
  { value: 'educational', label: 'Educational', icon: '📚' },
  { value: 'scenic', label: 'Scenic', icon: '🏔️' },
  { value: 'dog-friendly', label: 'Dog Friendly', icon: '🐕' },
  { value: 'sustainable', label: 'Sustainable', icon: '🌱' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

// Group size options
const GROUP_SIZE_OPTIONS = [
  { value: '', label: 'Any Group Size' },
  { value: '2', label: 'Just 2 of us' },
  { value: '6', label: 'Small group (up to 6)' },
  { value: '10', label: 'Medium group (7-10)' },
  { value: '15', label: 'Large group (11+)' },
];

export function WineryGrid({ initialWineries }: WineryGridProps) {
  const setDirectoryContext = usePageContextStore((state) => state.setDirectoryContext);
  const analytics = useAnalyticsStore();
  const [filter, setFilter] = useState<'all' | 'reservation' | 'walk-in'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New filter/sort state
  const [sortBy, setSortBy] = useState('featured');
  const [groupSize, setGroupSize] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
        analytics.trackSearch(searchQuery, 'wineries', filteredWineries.length);
      }, 1000);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // Note: filteredWineries.length is intentionally not in deps - we only want to track
    // when searchQuery changes, capturing the count at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, analytics]);

  // Toggle experience tag
  const toggleExperienceTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilter('all');
    setSelectedTags([]);
    setGroupSize('');
    setSortBy('featured');
    setSearchQuery('');
  }, []);

  // Client-side filtering and sorting
  const filteredWineries = useMemo(() => {
    let results = initialWineries.filter((winery) => {
      // Filter by reservation requirement
      if (filter === 'reservation' && !winery.reservation_required) return false;
      if (filter === 'walk-in' && winery.reservation_required) return false;

      // Filter by experience tags
      if (selectedTags.length > 0) {
        const wineryTags = winery.experience_tags || [];
        if (!selectedTags.some((tag) => wineryTags.includes(tag))) return false;
      }

      // Filter by group size
      if (groupSize) {
        const maxSize = winery.max_group_size || 14; // Default to 14 if not set
        if (maxSize < parseInt(groupSize, 10)) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          winery.name.toLowerCase().includes(query) ||
          winery.description?.toLowerCase().includes(query) ||
          winery.wine_styles?.some((style) => style.toLowerCase().includes(query)) ||
          winery.region?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });

    // Sort results
    switch (sortBy) {
      case 'name-asc':
        results = [...results].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        results = [...results].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'rating':
        results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price-low':
        results = [...results].sort((a, b) => (a.tasting_fee || 0) - (b.tasting_fee || 0));
        break;
      case 'price-high':
        results = [...results].sort((a, b) => (b.tasting_fee || 0) - (a.tasting_fee || 0));
        break;
      default:
        // Featured: verified first, then by rating
        results = [...results].sort((a, b) => {
          if (a.verified && !b.verified) return -1;
          if (!a.verified && b.verified) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return results;
  }, [initialWineries, filter, selectedTags, groupSize, searchQuery, sortBy]);

  // Count active filters
  const activeFilterCount = [
    filter !== 'all',
    selectedTags.length > 0,
    groupSize !== '',
  ].filter(Boolean).length;

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search wineries by name, wine style, or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 focus:border-[#8B1538]"
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

      {/* Filter Controls Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'walk-in', label: 'Walk-in Welcome' },
            { value: 'reservation', label: 'Reservation' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'bg-[#8B1538] text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort & More Filters */}
        <div className="flex gap-3">
          {/* Group Size */}
          <select
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30"
          >
            {GROUP_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#8B1538] text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-white text-[#8B1538] rounded-full text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Experience Tags Filter (Expandable) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-stone-900">Experience Style</h3>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-[#8B1538] hover:underline"
              >
                Clear tags
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_TAG_OPTIONS.map((tag) => (
              <button
                key={tag.value}
                onClick={() => toggleExperienceTag(tag.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedTags.includes(tag.value)
                    ? 'bg-[#8B1538] text-white shadow-md'
                    : 'bg-white text-stone-700 border border-stone-200 hover:border-[#8B1538]/50'
                }`}
              >
                <span className="mr-1">{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count & Clear Filters */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-stone-600">
          Showing {filteredWineries.length} winer{filteredWineries.length !== 1 ? 'ies' : 'y'}
          {activeFilterCount > 0 && (
            <span className="text-stone-400"> (filtered)</span>
          )}
        </p>
        {(activeFilterCount > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            className="text-sm text-[#8B1538] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all filters
          </button>
        )}
      </div>

      {/* Winery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWineries.map((winery) => (
          <Link
            key={winery.id}
            href={`/wineries/${winery.slug}`}
            className="group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {/* Image */}
            <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
              {winery.image_url ? (
                <Image src={winery.image_url} alt={winery.name} className="object-cover" fill unoptimized />
              ) : (
                <span className="text-6xl">🍷</span>
              )}
              {/* Verification Badge */}
              {winery.verified && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-md">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </div>
              )}
              {/* Good for Groups Badge */}
              {(winery.max_group_size || 0) > 8 && (
                <div className="absolute top-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                  👥 Groups Welcome
                </div>
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

              <p className="text-stone-600 text-sm mb-3 line-clamp-2">
                {winery.description}
              </p>

              {/* Experience Tags */}
              {winery.experience_tags && winery.experience_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {winery.experience_tags.slice(0, 3).map((tag) => {
                    const tagConfig = EXPERIENCE_TAG_OPTIONS.find((t) => t.value === tag);
                    return (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#8B1538]/10 text-[#8B1538] text-xs rounded-full"
                      >
                        {tagConfig ? `${tagConfig.icon} ${tagConfig.label}` : tag}
                      </span>
                    );
                  })}
                  {winery.experience_tags.length > 3 && (
                    <span className="px-2 py-0.5 text-stone-400 text-xs">
                      +{winery.experience_tags.length - 3}
                    </span>
                  )}
                </div>
              )}

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

      {/* Empty State */}
      {filteredWineries.length === 0 && (
        <div className="text-center py-16">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-xl font-semibold text-stone-900 mb-2">No wineries found</h3>
          <p className="text-stone-600">Try adjusting your search or filters</p>
        </div>
      )}
    </>
  );
}
