'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePageContextStore } from '@/lib/stores/pageContext';
import { useAnalyticsStore } from '@/lib/stores/analytics-simple';

// Types matching the API response
interface Winery {
  id: number;
  name: string;
  slug: string;
  region: string;
  description: string;
  long_description?: string;
  wine_styles: string[];
  tasting_fee: number;
  tasting_fee_waived?: string;
  reservation_required: boolean;
  hours?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  features: string[];
  image_url?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function WineryDetailPage({ params }: PageProps) {
  const setWineryContext = usePageContextStore((state) => state.setWineryContext);
  const clearContext = usePageContextStore((state) => state.clearContext);
  const analytics = useAnalyticsStore();
  const [winery, setWinery] = useState<Winery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  // Fetch winery data from API
  const fetchWinery = useCallback(async (winerySlug: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/wineries/${winerySlug}`);
      const data = await response.json();

      if (data.success) {
        setWinery(data.data);
      } else {
        // Handle error - could be string or object
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || 'Winery not found';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching winery:', err);
      setError('Failed to load winery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load winery data when slug is available
  useEffect(() => {
    if (slug) {
      fetchWinery(slug);
    }
  }, [slug, fetchWinery]);

  // Set page context for the chat widget
  useEffect(() => {
    if (winery) {
      setWineryContext({
        id: winery.id,
        name: winery.name,
        slug: winery.slug,
        description: winery.description,
        tastingFee: winery.tasting_fee,
        reservationRequired: winery.reservation_required,
        wineStyles: winery.wine_styles,
        region: winery.region,
      });

      // Track winery view
      analytics.trackEvent('page_view', {
        page_type: 'winery_detail',
        winery_id: winery.id,
        winery_name: winery.name,
      });
    }

    return () => {
      clearContext();
    };
  }, [winery, setWineryContext, clearContext, analytics]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading winery...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !winery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🍷</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Winery Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The winery you are looking for does not exist.'}</p>
          <Link
            href="/wineries"
            className="inline-block px-6 py-3 bg-[#8B1538] text-white rounded-xl font-semibold hover:bg-[#722F37] transition-colors"
          >
            Browse All Wineries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/wineries" className="text-gray-500 hover:text-[#8B1538]">
              Wineries
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900">{winery.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Winery Image */}
            <div className="w-full md:w-1/3 aspect-square bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
              {winery.image_url ? (
                <img src={winery.image_url} alt={winery.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl">🍷</span>
              )}
            </div>

            {/* Winery Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {winery.region}
                </span>
                {winery.reservation_required && (
                  <span className="px-3 py-1 bg-amber-500/90 rounded-full text-sm">
                    Reservation Required
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">{winery.name}</h1>

              {winery.rating && (
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span className="font-semibold">{winery.rating}</span>
                    {winery.review_count && (
                      <span className="text-white/70">({winery.review_count} reviews)</span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-lg text-white/90 mb-6">{winery.description}</p>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/70 text-sm mb-1">Tasting Fee</p>
                  <p className="font-semibold">
                    {winery.tasting_fee > 0 ? `$${winery.tasting_fee}` : 'By Appointment'}
                  </p>
                </div>
                {winery.hours && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-1">Hours</p>
                    <p className="font-semibold">{winery.hours}</p>
                  </div>
                )}
                {winery.address && (
                  <div className="bg-white/10 rounded-xl p-4 col-span-2">
                    <p className="text-white/70 text-sm mb-1">Address</p>
                    <p className="font-semibold">{winery.address}</p>
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
            {/* About */}
            {winery.long_description && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <div className="prose prose-gray max-w-none">
                  {winery.long_description.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-gray-600 mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Wine Styles */}
            {winery.wine_styles?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Wine Varieties</h2>
                <div className="flex flex-wrap gap-2">
                  {winery.wine_styles.map((style) => (
                    <span
                      key={style}
                      className="px-4 py-2 bg-[#8B1538]/10 text-[#8B1538] rounded-full font-medium"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Features */}
            {winery.features?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Features & Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {winery.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Visit Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Your Visit</h3>

              {/* Tasting Info */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Tasting Fee</span>
                  <span className="font-semibold text-[#8B1538]">
                    {winery.tasting_fee > 0 ? `$${winery.tasting_fee}/person` : 'By Appointment'}
                  </span>
                </div>
                {winery.tasting_fee_waived && (
                  <p className="text-sm text-gray-500">{winery.tasting_fee_waived}</p>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                {winery.phone && (
                  <a
                    href={`tel:${winery.phone}`}
                    onClick={() => analytics.trackPhoneClick(winery.phone!, winery.name)}
                    className="flex items-center gap-3 text-gray-700 hover:text-[#8B1538]"
                  >
                    <span>📞</span>
                    <span>{winery.phone}</span>
                  </a>
                )}
                {winery.website && (
                  <a
                    href={winery.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => analytics.trackExternalLinkClick(winery.website!, winery.name)}
                    className="flex items-center gap-3 text-gray-700 hover:text-[#8B1538]"
                  >
                    <span>🌐</span>
                    <span>Visit Website</span>
                  </a>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                {winery.reservation_required ? (
                  <a
                    href={winery.website || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => analytics.trackReservationClick(winery.name, winery.id)}
                    className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors"
                  >
                    Make Reservation
                  </a>
                ) : (
                  <div className="bg-green-50 text-green-800 text-center py-3 rounded-xl font-medium">
                    Walk-ins Welcome
                  </div>
                )}

                <button
                  onClick={() => {
                    // Track winery added to trip
                    analytics.trackWineryAdded(winery.name, winery.id);
                    // Show confirmation toast or open chat
                    alert(`${winery.name} added to your trip! Open the chat to continue planning.`);
                  }}
                  className="block w-full bg-amber-500 text-white text-center py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
                >
                  Add to My Trip 🗺️
                </button>
              </div>

              {/* Chat Prompt */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">
                  Have questions about {winery.name}?
                </p>
                <p className="text-sm text-[#8B1538] font-medium">
                  💬 Ask our AI guide in the chat!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
