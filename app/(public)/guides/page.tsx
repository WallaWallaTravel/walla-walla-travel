import { Metadata } from 'next';
import Link from 'next/link';
import { getAllGuides } from '@/lib/data/guides';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Walla Walla Wine Country Guides',
  description:
    'Comprehensive guides for planning your Walla Walla wine trip. Best times to visit, wine basics, group planning tips, and insider knowledge.',
  keywords: [
    'Walla Walla wine guide',
    'wine country planning',
    'wine tasting tips',
    'Walla Walla travel guide',
    'wine tour planning',
  ],
  openGraph: {
    title: 'Walla Walla Wine Country Guides',
    description: 'Everything you need to know for the perfect wine country visit.',
    type: 'website',
    url: 'https://wallawalla.travel/guides',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/guides',
  },
};

// Guide icons
const guideIcons: Record<string, string> = {
  'best-time-to-visit': '📅',
  'wine-101': '🍷',
  'group-planning-tips': '👥',
};

export default function GuidesIndexPage() {
  const guides = getAllGuides();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Guides', url: 'https://wallawalla.travel/guides' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero with background image */}
        <PageHero
          title="Wine Country Guides"
          description="Everything you need to plan an unforgettable Walla Walla wine experience. Written by locals who know the valley best."
          backLink={{ href: '/', label: 'Back to Home' }}
        />

        {/* Guides Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Icon Header */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-8 border-b border-gray-100 flex items-center justify-center">
                  <span className="text-6xl">{guideIcons[guide.slug] || '📖'}</span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>{guide.readTime}</span>
                    <span>•</span>
                    <span>Updated {guide.lastUpdated}</span>
                  </div>

                  <h2 className="text-xl font-serif font-bold text-gray-900 group-hover:text-[#8B1538] transition-colors mb-2">
                    {guide.shortTitle}
                  </h2>

                  <p className="text-gray-600 mb-4">{guide.description}</p>

                  {/* CTA */}
                  <div className="flex items-center text-[#8B1538] font-medium group-hover:gap-3 gap-2 transition-all">
                    <span>Read Guide</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-[#722F37] to-[#8B1538] rounded-2xl p-8 text-white text-center">
            <h2 className="text-2xl font-serif font-bold mb-4">
              Ready to Start Planning?
            </h2>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Use our interactive planner to build your perfect wine country
              itinerary based on your preferences and group size.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-white text-[#8B1538] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Plan Your Trip
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
