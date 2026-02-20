'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LodgingPropertySummary } from '@/lib/services/lodging.service';
import { LodgingCard } from './LodgingCard';

// ============================================================================
// Constants
// ============================================================================

interface LodgingGridProps {
  initialProperties: LodgingPropertySummary[];
}

const PROPERTY_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'str', label: 'Short-Term Rental' },
  { value: 'bnb', label: 'B&B' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'resort', label: 'Resort' },
];

const PRICE_RANGE_OPTIONS = [
  { value: '', label: 'Any Price' },
  { value: 'under100', label: 'Under $100' },
  { value: '100-200', label: '$100 - $200' },
  { value: '200-300', label: '$200 - $300' },
  { value: '300+', label: '$300+' },
];

const BEDROOM_OPTIONS = [
  { value: '', label: 'Any Bedrooms' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedrooms' },
  { value: '3', label: '3 Bedrooms' },
  { value: '4', label: '4+ Bedrooms' },
];

const GUEST_OPTIONS = [
  { value: '', label: 'Any Guests' },
  { value: '2', label: '2 Guests' },
  { value: '4', label: '4 Guests' },
  { value: '6', label: '6 Guests' },
  { value: '8', label: '8+ Guests' },
];

const AMENITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'parking', label: 'Parking' },
  { value: 'pool', label: 'Pool' },
  { value: 'hot_tub', label: 'Hot Tub' },
  { value: 'pet_friendly', label: 'Pet Friendly' },
  { value: 'washer_dryer', label: 'Washer/Dryer' },
  { value: 'ac', label: 'A/C' },
  { value: 'fireplace', label: 'Fireplace' },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function matchesPriceBucket(minPrice: number | undefined, maxPrice: number | undefined, bucket: string): boolean {
  const price = minPrice || maxPrice || 0;
  switch (bucket) {
    case 'under100':
      return price > 0 && price < 100;
    case '100-200':
      return price >= 100 && price <= 200;
    case '200-300':
      return price > 200 && price <= 300;
    case '300+':
      return price > 300;
    default:
      return true;
  }
}

// ============================================================================
// Component
// ============================================================================

export function LodgingGrid({ initialProperties }: LodgingGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [propertyType, setPropertyType] = useState<string>(
    searchParams.get('type') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter/sort state
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured');
  const [priceBucket, setPriceBucket] = useState(searchParams.get('price') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [maxGuests, setMaxGuests] = useState(searchParams.get('guests') || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    searchParams.get('amenities')?.split(',').filter(Boolean) || []
  );
  const [showFilters, setShowFilters] = useState(false);

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

  // Handle property type change
  const handlePropertyTypeChange = useCallback((type: string) => {
    setPropertyType(type);
    updateURL({ type: type === 'all' ? null : type });
  }, [updateURL]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        updateURL({ search: searchQuery || null });
      }, 500);
    } else if (searchQuery === '') {
      updateURL({ search: null });
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Handle price bucket change
  const handlePriceBucketChange = useCallback((bucket: string) => {
    setPriceBucket(bucket);
    updateURL({ price: bucket || null });
  }, [updateURL]);

  // Handle bedroom change
  const handleBedroomChange = useCallback((value: string) => {
    setBedrooms(value);
    updateURL({ bedrooms: value || null });
  }, [updateURL]);

  // Handle max guests change
  const handleGuestChange = useCallback((value: string) => {
    setMaxGuests(value);
    updateURL({ guests: value || null });
  }, [updateURL]);

  // Toggle amenity
  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities((prev) => {
      const newAmenities = prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity];
      updateURL({ amenities: newAmenities.length > 0 ? newAmenities : null });
      return newAmenities;
    });
  }, [updateURL]);

  // Handle sort change
  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    updateURL({ sort: sort === 'featured' ? null : sort });
  }, [updateURL]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setPropertyType('all');
    setSearchQuery('');
    setSortBy('featured');
    setPriceBucket('');
    setBedrooms('');
    setMaxGuests('');
    setSelectedAmenities([]);
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  // Client-side filtering and sorting
  const filteredProperties = useMemo(() => {
    let results = initialProperties.filter((property) => {
      // Filter by property type
      if (propertyType !== 'all' && property.property_type !== propertyType) return false;

      // Filter by price bucket
      if (priceBucket && !matchesPriceBucket(property.price_range_min, property.price_range_max, priceBucket)) return false;

      // Filter by bedrooms
      if (bedrooms !== '') {
        const bedroomCount = parseInt(bedrooms, 10);
        if (bedroomCount === 4) {
          // 4+ bedrooms
          if ((property.bedrooms || 0) < 4) return false;
        } else {
          if ((property.bedrooms ?? -1) !== bedroomCount) return false;
        }
      }

      // Filter by max guests
      if (maxGuests !== '') {
        const guestCount = parseInt(maxGuests, 10);
        if (guestCount === 8) {
          // 8+ guests
          if ((property.max_guests || 0) < 8) return false;
        } else {
          if ((property.max_guests || 0) < guestCount) return false;
        }
      }

      // Filter by amenities
      if (selectedAmenities.length > 0) {
        const propertyAmenities = property.amenities || [];
        if (!selectedAmenities.some((amenity) => propertyAmenities.includes(amenity))) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          property.name.toLowerCase().includes(query) ||
          property.short_description?.toLowerCase().includes(query) ||
          property.city?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });

    // Sort results
    switch (sortBy) {
      case 'name-asc':
        results = [...results].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        results = [...results].sort((a, b) => (a.price_range_min || 0) - (b.price_range_min || 0));
        break;
      case 'price-high':
        results = [...results].sort((a, b) => (b.price_range_min || 0) - (a.price_range_min || 0));
        break;
      default:
        // Featured: featured first, then verified, then alphabetical
        results = [...results].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          if (a.is_verified && !b.is_verified) return -1;
          if (!a.is_verified && b.is_verified) return 1;
          return a.name.localeCompare(b.name);
        });
    }

    return results;
  }, [initialProperties, propertyType, priceBucket, bedrooms, maxGuests, selectedAmenities, searchQuery, sortBy]);

  // Count active filters
  const activeFilterCount = [
    propertyType !== 'all',
    priceBucket !== '',
    bedrooms !== '',
    maxGuests !== '',
    selectedAmenities.length > 0,
  ].filter(Boolean).length;

  // Auto-expand filters if amenities are active from URL
  useEffect(() => {
    if (selectedAmenities.length > 0) {
      setShowFilters(true);
    }
  }, [selectedAmenities.length]);

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, description, or city..."
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

      {/* Property Type Pills */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePropertyTypeChange(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                propertyType === option.value
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
          {/* Price Range */}
          <select
            value={priceBucket}
            onChange={(e) => handlePriceBucketChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            {PRICE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Bedrooms */}
          <select
            value={bedrooms}
            onChange={(e) => handleBedroomChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            {BEDROOM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Max Guests */}
          <select
            value={maxGuests}
            onChange={(e) => handleGuestChange(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-stone-700"
          >
            {GUEST_OPTIONS.map((opt) => (
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

          {/* Toggle Amenities Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              showFilters || selectedAmenities.length > 0
                ? 'bg-[#8B1538] text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Amenities
            {selectedAmenities.length > 0 && (
              <span className="w-5 h-5 bg-white text-[#8B1538] rounded-full text-xs flex items-center justify-center font-bold">
                {selectedAmenities.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Amenities Filter Panel (Expandable) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
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
                {amenity.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count & Clear Filters */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-stone-700">
          <span className="font-semibold text-[#8B1538]">{filteredProperties.length}</span>
          {' '}propert{filteredProperties.length !== 1 ? 'ies' : 'y'}
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

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <LodgingCard key={property.id} property={property} />
        ))}
      </div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-stone-900 mb-2">No properties found</h3>
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
