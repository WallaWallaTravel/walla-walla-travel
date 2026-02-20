'use client';

import React, { useState, useEffect } from 'react';

interface LodgingOption {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  city: string;
  cover_image_url?: string;
  price_range_min?: number;
  price_range_max?: number;
}

interface LodgingPickerProps {
  selectedId?: number;
  onSelect: (property: LodgingOption | null) => void;
}

export function LodgingPicker({ selectedId, onSelect }: LodgingPickerProps) {
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<LodgingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LodgingOption | null>(null);

  // Fetch properties on mount and when search changes (debounced)
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('limit', '10');
        const res = await fetch(`/api/lodging?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setProperties(data.data || []);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch lodging properties:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  // Load selected property on mount if selectedId provided
  useEffect(() => {
    if (selectedId && !selected) {
      // Try to find in current list
      const found = properties.find(p => p.id === selectedId);
      if (found) setSelected(found);
    }
  }, [selectedId, properties, selected]);

  const handleSelect = (property: LodgingOption) => {
    setSelected(property);
    onSelect(property);
    setSearch('');
  };

  const handleClear = () => {
    setSelected(null);
    onSelect(null);
  };

  // Property type labels
  const typeLabels: Record<string, string> = {
    hotel: 'Hotel',
    str: 'Short-Term Rental',
    bnb: 'B&B',
    vacation_rental: 'Vacation Rental',
    boutique_hotel: 'Boutique Hotel',
    resort: 'Resort',
  };

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
        {selected.cover_image_url ? (
          <img src={selected.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center text-xl">
            <span role="img" aria-label="Hotel">&#127976;</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-stone-900 truncate">{selected.name}</div>
          <div className="text-sm text-stone-500">{typeLabels[selected.property_type] || selected.property_type}</div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-stone-400 hover:text-red-500 transition-colors"
        >
          <span aria-label="Clear selection">&times;</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search lodging properties..."
        className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37] text-sm"
      />
      {loading && (
        <div className="text-sm text-stone-500 px-2">Searching...</div>
      )}
      {!loading && properties.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100">
          {properties.map((property) => (
            <button
              key={property.id}
              type="button"
              onClick={() => handleSelect(property)}
              className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 transition-colors text-left"
            >
              {property.cover_image_url ? (
                <img src={property.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center">
                  <span role="img" aria-label="Hotel">&#127976;</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-900 truncate">{property.name}</div>
                <div className="text-xs text-stone-500">
                  {typeLabels[property.property_type] || property.property_type}
                  {property.price_range_min && ` \u00b7 From $${property.price_range_min}/night`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {!loading && search && properties.length === 0 && (
        <div className="text-sm text-stone-500 px-2">No properties found</div>
      )}
    </div>
  );
}
