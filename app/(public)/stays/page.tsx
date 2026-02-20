import { Metadata } from 'next';
import { Suspense } from 'react';
import { getLodgingProperties } from '@/lib/data/lodging';
import { LodgingDirectoryClient } from '@/components/lodging/LodgingDirectoryClient';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

// Force dynamic rendering to avoid database connection at build time
export const dynamic = 'force-dynamic';

// ============================================================================
// SEO Metadata
// ============================================================================

export const metadata: Metadata = {
  title: 'Where to Stay in Walla Walla | Hotels, Rentals & B&Bs',
  description: 'Find the best places to stay in Walla Walla, Washington. Browse hotels, vacation rentals, B&Bs, and boutique accommodations in wine country.',
  keywords: [
    'Walla Walla hotels',
    'Walla Walla lodging',
    'wine country accommodation',
    'vacation rentals Walla Walla',
    'B&B Walla Walla',
    'where to stay Walla Walla',
  ],
  openGraph: {
    title: 'Where to Stay in Walla Walla | Hotels, Rentals & B&Bs',
    description: 'Find the best places to stay in Walla Walla wine country. Hotels, vacation rentals, B&Bs, and boutique accommodations.',
    type: 'website',
    url: 'https://wallawalla.travel/stays',
    images: [
      {
        url: 'https://wallawalla.travel/og-stays.jpg',
        width: 1200,
        height: 630,
        alt: 'Walla Walla Lodging',
      },
    ],
  },
  alternates: {
    canonical: 'https://wallawalla.travel/stays',
  },
  other: {
    'article:modified_time': new Date().toISOString(),
  },
};

// ============================================================================
// Page Component (Server Component)
// ============================================================================

export default async function StaysPage() {
  // Fetch data on the server - this content is visible to search engines
  const properties = await getLodgingProperties();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Stays', url: 'https://wallawalla.travel/stays' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <BreadcrumbJsonLd items={breadcrumbs} />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Where to Stay in Walla Walla
          </h1>
          <p className="text-xl text-white/80 max-w-2xl">
            From boutique hotels to cozy vacation rentals, find the perfect
            home base for your Walla Walla wine country experience.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Intro Summary */}
        <section className="mb-8 text-center">
          <h2 className="sr-only">About Walla Walla Lodging</h2>
          <p className="text-lg text-stone-600 max-w-3xl mx-auto">
            {properties.length > 0 ? (
              <>
                Browse <strong>{properties.length} {properties.length === 1 ? 'property' : 'properties'}</strong> in
                Walla Walla Valley. Hotels, B&Bs, vacation rentals, and more -- each
                listing verified for accuracy so you can book with confidence.
              </>
            ) : (
              <>
                Our curated lodging directory is coming soon. We are partnering
                with local properties to bring you <strong>accurate, up-to-date
                accommodation options</strong> in Walla Walla wine country.
              </>
            )}
          </p>
        </section>

        {/* Interactive Client Component - wrapped in Suspense for useSearchParams */}
        <Suspense fallback={<div className="animate-pulse">Loading properties...</div>}>
          <LodgingDirectoryClient properties={properties} />
        </Suspense>
      </div>
    </div>
  );
}
