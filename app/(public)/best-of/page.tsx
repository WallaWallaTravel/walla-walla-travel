import { Metadata } from 'next';
import Link from 'next/link';
import { getAllBestOfCategories } from '@/lib/data/best-of-categories';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Best Wineries in Walla Walla by Category',
  description: 'Discover the best Walla Walla wineries for every occasion. From dog-friendly venues to romantic escapes, find the perfect winery for your visit.',
  keywords: [
    'best Walla Walla wineries',
    'top wineries Walla Walla',
    'dog-friendly wineries',
    'romantic wineries',
    'group wine tasting',
    'scenic wineries',
  ],
  openGraph: {
    title: 'Best Wineries in Walla Walla by Category',
    description: 'Curated lists of the best Walla Walla wineries for every type of visitor.',
    type: 'website',
    url: 'https://wallawalla.travel/best-of',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Wineries in Walla Walla by Category',
    description: 'Curated lists of the best Walla Walla wineries for every type of visitor.',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/best-of',
  },
};

// Category icons
const categoryIcons: Record<string, string> = {
  'dog-friendly': '🐕',
  'romantic': '💕',
  'views': '🏔️',
};

export default function BestOfIndexPage() {
  const categories = getAllBestOfCategories();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Best Of', url: 'https://wallawalla.travel/best-of' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero with background image */}
        <PageHero
          title="Best Wineries in Walla Walla"
          description="Curated lists to help you find the perfect winery for any occasion. Whether you're traveling with your dog, planning a group outing, or seeking romance, we've got you covered."
          backLink={{ href: '/', label: 'Back to Home' }}
        />

        {/* Categories Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/best-of/${category.slug}`}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-4xl">{categoryIcons[category.slug] || '🍷'}</span>
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-gray-900 group-hover:text-[#8B1538] transition-colors">
                        {category.shortTitle}
                      </h2>
                      <p className="text-sm text-gray-500">Top picks for 2026</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{category.description}</p>

                  {/* Criteria Preview */}
                  <div className="space-y-2 mb-4">
                    {category.criteria.slice(0, 2).map((criterion) => (
                      <div key={criterion} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="text-green-500">✓</span>
                        <span>{criterion}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center text-[#8B1538] font-medium group-hover:gap-3 gap-2 transition-all">
                    <span>View Top Picks</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-16 bg-gray-50 rounded-2xl p-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                How We Choose the Best
              </h2>
              <p className="text-gray-600 mb-6">
                Our recommendations are based on extensive local knowledge, visitor feedback,
                and firsthand experience. We evaluate each winery on specific criteria relevant
                to each category, ensuring our picks truly deliver on what they promise.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="px-4 py-2 bg-white rounded-full text-gray-600">Local expertise</span>
                <span className="px-4 py-2 bg-white rounded-full text-gray-600">Visitor reviews</span>
                <span className="px-4 py-2 bg-white rounded-full text-gray-600">Regular updates</span>
                <span className="px-4 py-2 bg-white rounded-full text-gray-600">No paid placements</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
