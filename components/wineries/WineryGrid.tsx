'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePageContextStore } from '@/lib/stores/pageContext';
import { useAnalyticsStore } from '@/lib/stores/analytics-simple';
import { FavoriteButtonCompact } from './FavoriteButton';

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
  experience_tags?: string[];
  features?: string[];
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
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

// Group size options
const GROUP_SIZE_OPTIONS = [
  { value: '', label: 'Any Group Size' },
  { value: '2', label: 'Couple (2)' },
  { value: '6', label: 'Small (3-6)' },
  { value: '11', label: 'Medium (7-11)' },
  { value: '12', label: 'Large (12+)' },
];

// Tasting fee bucket options
const FEE_BUCKET_OPTIONS = [
  { value: '', label: 'Any Price' },
  { value: 'free', label: 'Free' },
  { value: 'under20', label: 'Under $20' },
  { value: '20-40', label: '$20 - $40' },
  { value: 'over40', label: '$40+' },
];

// Common amenities/features for filtering
const AMENITY_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'outdoor seating', label: 'Outdoor Seating', icon: '☀️' },
  { value: 'picnic area', label: 'Picnic Area', icon: '🧺' },
  { value: 'food available', label: 'Food Available', icon: '🍽️' },
  { value: 'private tastings', label: 'Private Tastings', icon: '🥂' },
  { value: 'tours available', label: 'Tours', icon: '🚶' },
  { value: 'wheelchair accessible', label: 'Accessible', icon: '♿' },
  { value: 'event space', label: 'Event Space', icon: '🎉' },
  { value: 'club membership', label: 'Wine Club', icon: '🏆' },
];

// Helper function to check if winery matches amenity
function wineryHasAmenity(wineryFeatures: string[] | undefined, amenity: string): boolean {
  if (!wineryFeatures || wineryFeatures.length === 0) return false;
  const lowerAmenity = amenity.toLowerCase();
  return wineryFeatures.some(f => f.toLowerCase().includes(lowerAmenity));
}

// Helper function to check fee bucket
function matchesFeeBucket(fee: number, bucket: string): boolean {
  switch (bucket) {
    case 'free':
      return fee === 0;
    case 'under20':
      return fee > 0 && fee < 20;
    case '20-40':
      return fee >= 20 && fee <= 40;
    case 'over40':
      return fee > 40;
    default:
      return true;
  }
}

export function WineryGrid({ initialWineries }: WineryGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setDirectoryContext = usePageContextStore((state) => state.setDirectoryContext);
  const analytics = useAnalyticsStore();

  // Initialize state from URL params
  const [filter, setFilter] = useState<'all' | 'reservation' | 'walk-in'>(
    (searchParams.get('reservation') as 'all' | 'reservation' | 'walk-in') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter/sort state
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured');
  const [groupSize, setGroupSize] = useState(searchParams.get('groupSize') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [showFilters, setShowFilters] = useState(false);

  // New filter states
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || '');
  const [feeBucket, setFeeBucket] = useState(searchParams.get('fee') || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    searchParams.get('amenities')?.split(',').filter(Boolean) || []
  );
  const [selectedWineStyles, setSelectedWineStyles] = useState<string[]>(
    searchParams.get('wines')?.split(',').filter(Boolean) || []
  );

  // Extract unique regions from data
  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    initialWineries.forEach(w => {
      if (w.region) regions.add(w.region);
    });
    return Array.from(regions).sort();
  }, [initialWineries]);

  // Extract unique wine styles from data
  const availableWineStyles = useMemo(() => {
    const styles = new Set<string>();
    initialWineries.forEach(w => {
      w.wine_styles?.forEach(style => styles.add(style));
    });
    return Array.from(styles).sort();
  }, [initialWineries]);

  // Set page context for the chat widget
  useEffect(() => {
    setDirectoryContext({ category: 'wineries' });
  }, [setDirectoryContext]);

  // Sync filters to URL
  const updateURL = useCallback((params: Record<string, string | string[] | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, value);
      }
    });

    const newURL = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
    router.replace(newURL, { scroll: false });
  }, [router, searchParams]);

  // Track filter changes
  const handleFilterChange = useCallback((newFilter: typeof filter) => {
    setFilter(newFilter);
    updateURL({ reservation: newFilter === 'all' ? null : newFilter });
    if (newFilter !== 'all') {
      analytics.trackFilterApplied('reservation', newFilter);
    }
  }, [analytics, updateURL]);

  // Track search with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        analytics.trackSearch(searchQuery, 'wineries', filteredWineries.length);
        updateURL({ search: searchQuery || null });
      }, 1000);
    } else if (searchQuery === '') {
      updateURL({ search: null });
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, analytics]);

  // Toggle experience tag
  const toggleExperienceTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      updateURL({ tags: newTags.length > 0 ? newTags : null });
      return newTags;
    });
  }, [updateURL]);

  // Toggle amenity
  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities((prev) => {
      const newAmenities = prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity];
      updateURL({ amenities: newAmenities.length > 0 ? newAmenities : null });
      return newAmenities;
    });
  }, [updateURL]);

  // Toggle wine style
  const toggleWineStyle = useCallback((style: string) => {
    setSelectedWineStyles((prev) => {
      const newStyles = prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style];
      updateURL({ wines: newStyles.length > 0 ? newStyles : null });
      return newStyles;
    });
  }, [updateURL]);

  // Handle region change
  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
    updateURL({ region: region || null });
    if (region) {
      analytics.trackFilterApplied('region', region);
    }
  }, [updateURL, analytics]);

  // Handle fee bucket change
  const handleFeeBucketChange = useCallback((bucket: string) => {
    setFeeBucket(bucket);
    updateURL({ fee: bucket || null });
    if (bucket) {
      analytics.trackFilterApplied('fee', bucket);
    }
  }, [updateURL, analytics]);

  // Handle sort change
  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    updateURL({ sort: sort === 'featured' ? null : sort });
  }, [updateURL]);

  // Handle group size change
  const handleGroupSizeChange = useCallback((size: string) => {
    setGroupSize(size);
    updateURL({ groupSize: size || null });
    if (size) {
      analytics.trackFilterApplied('groupSize', size);
    }
  }, [updateURL, analytics]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilter('all');
    setSelectedTags([]);
    setGroupSize('');
    setSortBy('featured');
    setSearchQuery('');
    setSelectedRegion('');
    setFeeBucket('');
    setSelectedAmenities([]);
    setSelectedWineStyles([]);
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  // Client-side filtering and sorting
  const filteredWineries = useMemo(() => {
    let results = initialWineries.filter((winery) => {
      // Filter by reservation requirement
      if (filter === 'reservation' && !winery.reservation_required) return false;
      if (filter === 'walk-in' && winery.reservation_required) return false;

      // Filter by region
      if (selectedRegion && winery.region !== selectedRegion) return false;

      // Filter by tasting fee bucket
      if (feeBucket && !matchesFeeBucket(winery.tasting_fee || 0, feeBucket)) return false;

      // Filter by experience tags
      if (selectedTags.length > 0) {
        const wineryTags = winery.experience_tags || [];
        if (!selectedTags.some((tag) => wineryTags.includes(tag))) return false;
      }

      // Filter by amenities
      if (selectedAmenities.length > 0) {
        if (!selectedAmenities.some((amenity) => wineryHasAmenity(winery.features, amenity))) return false;
      }

      // Filter by wine styles
      if (selectedWineStyles.length > 0) {
        const wineryStyles = winery.wine_styles || [];
        if (!selectedWineStyles.some((style) => wineryStyles.includes(style))) return false;
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
      case 'price-low':
        results = [...results].sort((a, b) => (a.tasting_fee || 0) - (b.tasting_fee || 0));
        break;
      case 'price-high':
        results = [...results].sort((a, b) => (b.tasting_fee || 0) - (a.tasting_fee || 0));
        break;
      default:
        // Featured: verified first, then alphabetical
        results = [...results].sort((a, b) => {
          if (a.verified && !b.verified) return -1;
          if (!a.verified && b.verified) return 1;
          return a.name.localeCompare(b.name);
        });
    }

    return results;
  }, [initialWineries, filter, selectedRegion, feeBucket, selectedTags, selectedAmenities, selectedWineStyles, groupSize, searchQuery, sortBy]);

  // Count active filters
  const activeFilterCount = [
    filter !== 'all',
    selectedTags.length > 0,
    groupSize !== '',
    selectedRegion !== '',
    feeBucket !== '',
    selectedAmenities.length > 0,
    selectedWineStyles.length > 0,
  ].filter(Boolean).length;

  // Check if any advanced filters are active (to auto-expand)
  useEffect(() => {
    if (activeFilterCount > 1 || selectedAmenities.length > 0 || selectedWineStyles.length > 0) {
      setShowFilters(true);
    }
  }, [activeFilterCount, selectedAmenities.length, selectedWineStyles.length]);

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
            className="w-full px-4 py-3 pl-12 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 focus:border-[#8B1538] placeholder-gray-600"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
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

        {/* Sort & Dropdowns */}
        <div className="flex gap-3 flex-wrap">
          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            <option value="">All Regions</option>
            {availableRegions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          {/* Fee Bucket Filter */}
          <select
            value={feeBucket}
            onChange={(e) => handleFeeBucketChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            {FEE_BUCKET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Group Size */}
          <select
            value={groupSize}
            onChange={(e) => handleGroupSizeChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            {GROUP_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
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
            More Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-white text-[#8B1538] rounded-full text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel (Expandable) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
          {/* Experience Style Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-stone-900">Experience Style</h3>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedTags([]);
                    updateURL({ tags: null });
                  }}
                  className="text-sm text-[#8B1538] hover:underline"
                >
                  Clear
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

          {/* Amenities Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-stone-900">Amenities</h3>
              {selectedAmenities.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedAmenities([]);
                    updateURL({ amenities: null });
                  }}
                  className="text-sm text-[#8B1538] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <button
                  key={amenity.value}
                  onClick={() => toggleAmenity(amenity.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedAmenities.includes(amenity.value)
                      ? 'bg-[#8B1538] text-white shadow-md'
                      : 'bg-white text-stone-700 border border-stone-200 hover:border-[#8B1538]/50'
                  }`}
                >
                  <span className="mr-1">{amenity.icon}</span>
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wine Styles Section */}
          {availableWineStyles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-stone-900">Wine Styles</h3>
                {selectedWineStyles.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedWineStyles([]);
                      updateURL({ wines: null });
                    }}
                    className="text-sm text-[#8B1538] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableWineStyles.slice(0, 12).map((style) => (
                  <button
                    key={style}
                    onClick={() => toggleWineStyle(style)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedWineStyles.includes(style)
                        ? 'bg-[#8B1538] text-white shadow-md'
                        : 'bg-white text-stone-700 border border-stone-200 hover:border-[#8B1538]/50'
                    }`}
                  >
                    🍷 {style}
                  </button>
                ))}
                {availableWineStyles.length > 12 && (
                  <span className="px-3 py-1.5 text-stone-500 text-sm">
                    +{availableWineStyles.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Count & Clear Filters */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-stone-700">
          <span className="font-semibold text-[#8B1538]">{filteredWineries.length}</span>
          {' '}winer{filteredWineries.length !== 1 ? 'ies' : 'y'}
          {activeFilterCount > 0 && (
            <span className="text-stone-500"> matching your filters</span>
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
        {filteredWineries.map((winery, index) => (
          <Link
            key={winery.slug || `winery-${index}`}
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
              {/* Favorite Button */}
              <FavoriteButtonCompact
                winery={{
                  id: winery.id,
                  name: winery.name,
                  slug: winery.slug,
                  region: winery.region,
                  image_url: winery.image_url,
                  tasting_fee: winery.tasting_fee,
                }}
                source="grid"
              />
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-stone-900 group-hover:text-[#722F37] transition-colors">
                  {winery.name}
                </h3>
              </div>

              {/* Region Badge */}
              {winery.region && (
                <p className="text-sm text-stone-500 mb-2">{winery.region}</p>
              )}

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
                    <span className="px-2 py-0.5 text-stone-500 text-xs">
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
                <span className="text-stone-600 font-medium">
                  {winery.tasting_fee > 0 ? `$${winery.tasting_fee} tasting` : 'Free tasting'}
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
          <p className="text-stone-600 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37] transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </>
  );
}
