'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ============================================================================
// Types
// ============================================================================

interface LodgingCardProps {
  property: {
    id: number;
    name: string;
    slug: string;
    property_type: string;
    city: string;
    short_description?: string;
    amenities: string[];
    bedrooms?: number;
    max_guests?: number;
    price_range_min?: number;
    price_range_max?: number;
    cover_image_url?: string;
    pet_policy?: string;
    is_verified: boolean;
    is_featured: boolean;
  };
}

// ============================================================================
// Constants
// ============================================================================

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  str: 'Short-Term Rental',
  bnb: 'B&B',
  vacation_rental: 'Vacation Rental',
  boutique_hotel: 'Boutique Hotel',
  resort: 'Resort',
};

const AMENITY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  kitchen: {
    label: 'Kitchen',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  wifi: {
    label: 'WiFi',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
      </svg>
    ),
  },
  parking: {
    label: 'Parking',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h6l2-2zm5 0V8a1 1 0 00-1-1h-2l-3 3v6l2 2h2a1 1 0 001-1z" />
      </svg>
    ),
  },
  pool: {
    label: 'Pool',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  hot_tub: {
    label: 'Hot Tub',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  pet_friendly: {
    label: 'Pet Friendly',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  washer_dryer: {
    label: 'Washer/Dryer',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  ac: {
    label: 'A/C',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  fireplace: {
    label: 'Fireplace',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
};

// ============================================================================
// Component
// ============================================================================

export function LodgingCard({ property }: LodgingCardProps) {
  const typeLabel = PROPERTY_TYPE_LABELS[property.property_type] || property.property_type;

  // Format price range display
  const priceDisplay = (() => {
    if (property.price_range_min && property.price_range_max) {
      return `$${property.price_range_min} - $${property.price_range_max}`;
    }
    if (property.price_range_min) {
      return `From $${property.price_range_min}`;
    }
    if (property.price_range_max) {
      return `Up to $${property.price_range_max}`;
    }
    return null;
  })();

  // Get first 4 amenities that have icons
  const displayAmenities = property.amenities
    .filter((a) => AMENITY_CONFIG[a])
    .slice(0, 4);

  return (
    <Link
      href={`/stays/${property.slug}`}
      className="group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
        {property.cover_image_url ? (
          <Image
            src={property.cover_image_url}
            alt={property.name}
            className="object-cover"
            fill
            unoptimized
          />
        ) : (
          <svg className="w-16 h-16 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )}

        {/* Property Type Badge - Top Left */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-stone-800 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
          {typeLabel}
        </div>

        {/* Verified Badge - Top Right */}
        {property.is_verified && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-md">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-stone-900 group-hover:text-[#722F37] transition-colors line-clamp-1">
            {property.name}
          </h3>
        </div>

        {/* City */}
        <p className="text-sm text-stone-500 mb-2">{property.city}</p>

        {/* Short Description */}
        {property.short_description && (
          <p className="text-stone-600 text-sm mb-3 line-clamp-2">
            {property.short_description}
          </p>
        )}

        {/* Amenity Icons */}
        {displayAmenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {displayAmenities.map((amenity) => {
              const config = AMENITY_CONFIG[amenity];
              return (
                <span
                  key={amenity}
                  className="flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded-full"
                  title={config.label}
                >
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                </span>
              );
            })}
            {property.amenities.length > 4 && (
              <span className="px-2 py-0.5 text-stone-500 text-xs">
                +{property.amenities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Pet Friendly Badge */}
        {property.pet_policy && property.pet_policy !== 'no_pets' && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Pet Friendly
            </span>
          </div>
        )}

        {/* Footer: Price + Details */}
        <div className="flex items-center justify-between text-sm">
          <div>
            {priceDisplay && (
              <span className="text-[#8B1538] font-semibold">
                {priceDisplay}
                <span className="text-stone-500 font-normal"> /night</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-stone-600">
            {property.bedrooms !== undefined && property.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
              </span>
            )}
            {property.max_guests !== undefined && property.max_guests !== null && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {property.max_guests}
              </span>
            )}
          </div>
        </div>

        {/* Book Now CTA */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <span className="block w-full text-center bg-[#8B1538] text-white py-2.5 rounded-lg font-medium group-hover:bg-[#722F37] transition-colors text-sm">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}
