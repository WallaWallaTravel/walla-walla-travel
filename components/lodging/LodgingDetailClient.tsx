'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LodgingProperty } from '@/lib/data/lodging';

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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  wifi: {
    label: 'WiFi',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
      </svg>
    ),
  },
  parking: {
    label: 'Parking',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h6l2-2zm5 0V8a1 1 0 00-1-1h-2l-3 3v6l2 2h2a1 1 0 001-1z" />
      </svg>
    ),
  },
  pool: {
    label: 'Pool',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  hot_tub: {
    label: 'Hot Tub',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  pet_friendly: {
    label: 'Pet Friendly',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  washer_dryer: {
    label: 'Washer/Dryer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  ac: {
    label: 'A/C',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  fireplace: {
    label: 'Fireplace',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
};

// ============================================================================
// Types
// ============================================================================

interface LodgingDetailClientProps {
  property: LodgingProperty;
}

// ============================================================================
// Component
// ============================================================================

export function LodgingDetailClient({ property }: LodgingDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const typeLabel = PROPERTY_TYPE_LABELS[property.property_type] || property.property_type;

  // Build gallery from cover image + images array
  const allImages = [
    ...(property.cover_image_url ? [property.cover_image_url] : []),
    ...property.images.filter((img) => img !== property.cover_image_url),
  ];

  // Price display
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

  // Determine booking CTA
  const hasBookingUrl = !!property.booking_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/stays" className="text-gray-500 hover:text-[#8B1538]">
              Stays
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900">{property.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Image Gallery */}
            <div className="w-full md:w-1/2">
              {/* Main Image */}
              <div className="aspect-[4/3] bg-white/10 rounded-2xl overflow-hidden relative mb-3">
                {allImages.length > 0 ? (
                  <Image
                    src={allImages[selectedImageIndex]}
                    alt={`${property.name} - Image ${selectedImageIndex + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden relative border-2 transition-colors ${
                        index === selectedImageIndex
                          ? 'border-white'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${property.name} thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {typeLabel}
                </span>
                {property.is_verified && (
                  <span className="px-3 py-1 bg-green-500/90 rounded-full text-sm inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-2">{property.name}</h1>

              <p className="text-lg text-white/80 mb-6">
                {property.city}, {property.state}
              </p>

              {/* Price Range */}
              {priceDisplay && (
                <div className="mb-6">
                  <span className="text-3xl font-bold">{priceDisplay}</span>
                  <span className="text-white/70 text-lg ml-2">/night</span>
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms !== undefined && property.bedrooms !== null && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-1">Bedrooms</p>
                    <p className="font-semibold">
                      {property.bedrooms === 0 ? 'Studio' : property.bedrooms}
                    </p>
                  </div>
                )}
                {property.bathrooms !== undefined && property.bathrooms !== null && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-1">Bathrooms</p>
                    <p className="font-semibold">{property.bathrooms}</p>
                  </div>
                )}
                {property.max_guests !== undefined && property.max_guests !== null && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-1">Max Guests</p>
                    <p className="font-semibold">{property.max_guests}</p>
                  </div>
                )}
                {property.min_stay_nights > 1 && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-1">Min Stay</p>
                    <p className="font-semibold">{property.min_stay_nights} nights</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {property.description && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
                <div className="prose prose-gray max-w-none">
                  {property.description.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-gray-700 mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.amenities.map((amenity) => {
                    const config = AMENITY_CONFIG[amenity];
                    return (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-[#8B1538]">
                          {config ? config.icon : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="text-gray-700">{config ? config.label : amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Property Features */}
            {property.property_features.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.property_features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-green-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Check-in/Check-out & Policies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.check_in_time && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Check-in Time</p>
                    <p className="font-medium text-gray-900">{property.check_in_time}</p>
                  </div>
                )}
                {property.check_out_time && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Check-out Time</p>
                    <p className="font-medium text-gray-900">{property.check_out_time}</p>
                  </div>
                )}
                {property.cancellation_policy && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Cancellation Policy</p>
                    <p className="text-gray-700">{property.cancellation_policy}</p>
                  </div>
                )}
                {property.pet_policy && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Pet Policy</p>
                    <p className="text-gray-700">{property.pet_policy}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Location */}
            {property.address && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#8B1538] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-gray-900 font-medium">{property.address}</p>
                      <p className="text-gray-600">
                        {property.city}, {property.state} {property.zip_code}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Book Your Stay</h3>

              {/* Price Info */}
              {priceDisplay && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Nightly Rate</span>
                    <span className="font-semibold text-[#8B1538]">{priceDisplay}</span>
                  </div>
                </div>
              )}

              {/* Property Details Summary */}
              <div className="space-y-2 mb-6 text-sm">
                {property.bedrooms !== undefined && property.bedrooms !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bedrooms</span>
                    <span className="text-gray-900 font-medium">
                      {property.bedrooms === 0 ? 'Studio' : property.bedrooms}
                    </span>
                  </div>
                )}
                {property.max_guests !== undefined && property.max_guests !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max Guests</span>
                    <span className="text-gray-900 font-medium">{property.max_guests}</span>
                  </div>
                )}
                {property.min_stay_nights > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Minimum Stay</span>
                    <span className="text-gray-900 font-medium">{property.min_stay_nights} nights</span>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                {hasBookingUrl ? (
                  <a
                    href={`/stay/${property.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors"
                  >
                    Book Now
                  </a>
                ) : (
                  <div className="bg-stone-50 text-stone-700 text-center py-3 rounded-xl font-medium">
                    Contact to Book
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-6 space-y-3">
                {property.phone && (
                  <a
                    href={`tel:${property.phone}`}
                    className="flex items-center gap-3 text-gray-700 hover:text-[#8B1538] transition-colors"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{property.phone}</span>
                  </a>
                )}
                {property.email && (
                  <a
                    href={`mailto:${property.email}`}
                    className="flex items-center gap-3 text-gray-700 hover:text-[#8B1538] transition-colors"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{property.email}</span>
                  </a>
                )}
                {property.website && (
                  <a
                    href={property.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-700 hover:text-[#8B1538] transition-colors"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>Visit Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
