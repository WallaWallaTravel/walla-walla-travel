'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePageContextStore } from '@/lib/stores/pageContext';
import { useAnalyticsStore } from '@/lib/stores/analytics-simple';
import type { Winery, WineryNarrativeContent } from '@/lib/data/wineries';
import { INSIDER_TIP_TYPES } from '@/lib/config/content-types';

interface WineryDetailClientProps {
  winery: Winery;
  narrativeContent?: WineryNarrativeContent;
}

// Map tip types to icons and labels
const TIP_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  [INSIDER_TIP_TYPES.LOCALS_KNOW]: { icon: '🏠', label: 'What Locals Know' },
  [INSIDER_TIP_TYPES.BEST_TIME]: { icon: '⏰', label: 'Best Time to Visit' },
  [INSIDER_TIP_TYPES.WHAT_TO_ASK]: { icon: '💬', label: 'What to Ask For' },
  [INSIDER_TIP_TYPES.PAIRING]: { icon: '🧀', label: 'Food Pairing' },
  [INSIDER_TIP_TYPES.PHOTO_SPOT]: { icon: '📸', label: 'Photo Spot' },
  [INSIDER_TIP_TYPES.HIDDEN_GEM]: { icon: '💎', label: 'Hidden Gem' },
  [INSIDER_TIP_TYPES.PRACTICAL]: { icon: '📋', label: 'Practical Tip' },
};

export function WineryDetailClient({ winery, narrativeContent }: WineryDetailClientProps) {
  const setWineryContext = usePageContextStore((state) => state.setWineryContext);
  const clearContext = usePageContextStore((state) => state.clearContext);
  const analytics = useAnalyticsStore();

  // Extract narrative content with defaults
  const originStory = narrativeContent?.originStory;
  const philosophy = narrativeContent?.philosophy;
  const uniqueStory = narrativeContent?.uniqueStory;
  const insiderTips = narrativeContent?.insiderTips || [];
  const hasNarrativeContent = originStory || philosophy || uniqueStory || insiderTips.length > 0;

  // Set page context for the chat widget and track view
  useEffect(() => {
    setWineryContext({
      id: winery.id,
      name: winery.name,
      slug: winery.slug,
    });

    // Track winery view
    analytics.trackEvent('page_view', {
      page_type: 'winery_detail',
      winery_id: winery.id,
      winery_name: winery.name,
    });

    return () => {
      clearContext();
    };
  }, [winery, setWineryContext, clearContext, analytics]);

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
            <div className="w-full md:w-1/3 aspect-square bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative">
              {winery.image_url ? (
                <Image
                  src={winery.image_url}
                  alt={winery.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-8xl">🍷</span>
              )}
            </div>

            {/* Winery Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {winery.region}
                </span>
                {winery.reservation_required && (
                  <span className="px-3 py-1 bg-amber-500/90 rounded-full text-sm">
                    Reservation Required
                  </span>
                )}
                {(winery as { verified?: boolean }).verified && (
                  <span className="px-3 py-1 bg-green-500/90 rounded-full text-sm inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
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

            {/* ================================================================ */}
            {/* NARRATIVE CONTENT - The "Soul Layer" */}
            {/* ================================================================ */}

            {/* Origin Story */}
            {originStory && (
              <section className="mt-12 pt-8 border-t border-gray-100">
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                  {originStory.title || 'Our Story'}
                </h2>
                <div className="prose prose-lg max-w-none text-gray-600">
                  {originStory.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Philosophy */}
            {philosophy && (
              <section className="mt-8">
                <h2 className="text-xl font-serif font-semibold text-gray-900 mb-4">
                  {philosophy.title || 'Our Philosophy'}
                </h2>
                <blockquote className="border-l-4 border-[#8B1538] pl-6 py-2 italic text-gray-700 bg-[#8B1538]/5 rounded-r-lg">
                  {philosophy.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </blockquote>
              </section>
            )}

            {/* What Makes Us Unique */}
            {uniqueStory && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {uniqueStory.title || 'What Makes Us Unique'}
                </h2>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <div className="prose max-w-none text-gray-700">
                    {uniqueStory.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Insider Tips */}
            {insiderTips.length > 0 && (
              <section className="mt-12 pt-8 border-t border-gray-100">
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <h2 className="text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    Insider Tips
                  </h2>
                  <div className="space-y-4">
                    {insiderTips.map((tip) => {
                      const config = TIP_TYPE_CONFIG[tip.tip_type] || { icon: '💡', label: 'Tip' };
                      return (
                        <div key={tip.id} className="flex gap-3">
                          <span className="text-2xl flex-shrink-0">{config.icon}</span>
                          <div>
                            <p className="font-medium text-amber-900">
                              {tip.title || config.label}
                            </p>
                            <p className="text-amber-800 mt-1">{tip.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    onClick={() => analytics.trackPhoneClick(winery.id, winery.name)}
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
                    onClick={() => analytics.trackExternalLinkClick(winery.id, winery.name, 'website')}
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
                    onClick={() => analytics.trackReservationClick(winery.id, winery.name)}
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
                    analytics.trackWineryAdded(winery.id, winery.name);
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

            {/* Tour CTA - Connect Authority Platform to Tour Business */}
            <div className="bg-gradient-to-br from-purple-50 to-[#8B1538]/5 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🚐</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Experience {winery.name} with a Guide
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Skip the logistics. Our guides know the winemakers and can create
                    experiences you can&apos;t book on your own.
                  </p>
                  <ul className="text-xs text-gray-500 mt-3 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      Licensed &amp; insured (USDOT 3603851)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      Groups up to 14 in luxury Sprinters
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      Personalized itinerary including {winery.name}
                    </li>
                  </ul>
                  <Link
                    href={`/book?winery=${encodeURIComponent(winery.name)}`}
                    onClick={() => analytics.trackEvent('tour_cta_click', {
                      winery_id: winery.id,
                      winery_name: winery.name,
                      source: 'winery_detail_sidebar',
                    })}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-[#8B1538] text-white text-sm font-semibold rounded-lg hover:bg-[#722F37] transition-colors w-full justify-center"
                  >
                    Plan Your Guided Tour
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
