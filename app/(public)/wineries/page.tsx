import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getWineries } from '@/lib/data/wineries';
import { WineryDirectoryClient } from '@/components/wineries/WineryDirectoryClient';

// Force dynamic rendering to avoid database connection at build time
export const dynamic = 'force-dynamic';

// ============================================================================
// SEO Metadata
// ============================================================================

export const metadata: Metadata = {
  title: 'Walla Walla Wineries | Wine Tasting & Tours',
  description: 'Explore curated wineries in Walla Walla Valley, Washington\'s award-winning wine region. Find tasting rooms, tour options, and plan your wine country experience.',
  keywords: ['Walla Walla wineries', 'wine tasting', 'wine tours', 'Washington wine', 'wine country'],
  openGraph: {
    title: 'Walla Walla Wineries | Wine Tasting & Tours',
    description: 'Explore curated wineries in Walla Walla Valley. From historic estates to boutique tasting rooms, find your perfect pour.',
    type: 'website',
    url: 'https://wallawalla.travel/wineries',
    images: [
      {
        url: 'https://wallawalla.travel/og-wineries.jpg',
        width: 1200,
        height: 630,
        alt: 'Walla Walla Wine Country',
      },
    ],
  },
  alternates: {
    canonical: 'https://wallawalla.travel/wineries',
  },
  // AI Discoverability: Content freshness signal
  other: {
    'article:modified_time': '2025-12-30T00:00:00Z',
  },
};

// ============================================================================
// Page Component (Server Component)
// ============================================================================

export default async function WineriesPage() {
  // Fetch data on the server - this content is visible to search engines
  const wineries = await getWineries();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Hero Section - Static content for SEO */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Walla Walla Wineries
          </h1>
          <p className="text-xl text-stone-300 max-w-2xl">
            Explore wineries in Washington&apos;s premier wine region.
            From historic estates to boutique tasting rooms, find your perfect pour.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* AI-Extractable Intro Summary */}
        <section className="mb-8 text-center">
          <h2 className="sr-only">About Walla Walla Wineries</h2>
          <p className="text-lg text-stone-600 max-w-3xl mx-auto">
            {wineries.length > 0 ? (
              <>
                Explore <strong>{wineries.length} partner-verified {wineries.length === 1 ? 'winery' : 'wineries'}</strong> in
                Walla Walla Valley. Each listing is managed directly by the winery with accurate hours,
                reservation info, and <strong>insider tips</strong>. More wineries joining soon.
              </>
            ) : (
              <>
                Our curated winery directory is coming soon. We&apos;re partnering directly with
                Walla Walla wineries to bring you <strong>accurate, up-to-date information</strong> managed
                by the wineries themselves.
              </>
            )}
          </p>
        </section>

        {/* Tour Suggestion Banner - Connect Discovery to Revenue */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚐</span>
            <div>
              <p className="font-medium text-amber-900">Planning to visit multiple wineries?</p>
              <p className="text-sm text-amber-700">
                A guided tour means no driving, no logistics, and insider access.
              </p>
            </div>
          </div>
          <Link
            href="/nw-touring"
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Learn About Tours
          </Link>
        </div>

        {/* Interactive Client Component - wrapped in Suspense for useSearchParams */}
        <Suspense fallback={<div className="animate-pulse">Loading wineries...</div>}>
          <WineryDirectoryClient wineries={wineries} />
        </Suspense>
      </div>
    </div>
  );
}
