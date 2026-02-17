import { Metadata } from 'next';
import Link from 'next/link';
import { getAllNeighborhoods } from '@/lib/data/neighborhoods';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Walla Walla Wine Districts & Neighborhoods',
  description: 'Explore the wine tasting areas of Walla Walla Valley. From walkable Downtown to rural estate country, get oriented before your visit.',
  keywords: [
    'Walla Walla wine districts',
    'wine tasting areas',
    'Downtown Walla Walla wineries',
    'Airport District wineries',
    'wine tour planning',
  ],
  openGraph: {
    title: 'Explore Walla Walla Wine Districts',
    description: 'Get to know the different wine tasting areas of Walla Walla Valley.',
    type: 'website',
    url: 'https://wallawalla.travel/neighborhoods',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Walla Walla Wine Districts',
    description: 'Get to know the different wine tasting areas of Walla Walla Valley.',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/neighborhoods',
  },
};

export default function NeighborhoodsPage() {
  const neighborhoods = getAllNeighborhoods();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Neighborhoods', url: 'https://wallawalla.travel/neighborhoods' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero with background image */}
        <PageHero
          title="Wine Country Districts"
          description="Walla Walla wine country is spread across several areas. This guide helps you understand the geography—great wineries exist in every district."
          backLink={{ href: '/', label: 'Back to Home' }}
        />

        {/* Neighborhood Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            {neighborhoods.map((neighborhood) => (
              <Link
                key={neighborhood.slug}
                href={`/neighborhoods/${neighborhood.slug}`}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#722F37]/10 to-[#8B1538]/10 p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 group-hover:text-[#8B1538] transition-colors">
                      {neighborhood.name}
                    </h2>
                    <span className="text-[#8B1538] group-hover:translate-x-1 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-gray-600">{neighborhood.description}</p>
                </div>

                {/* Details */}
                <div className="p-6">
                  {/* What You'll Find */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">What You&apos;ll Find:</p>
                    <div className="flex flex-wrap gap-2">
                      {neighborhood.whatYoullFind.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Approximate Wineries</p>
                    <p className="font-semibold text-gray-900">{neighborhood.approximateWineries}+</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA Section - Updated language */}
          <div className="mt-16 bg-gradient-to-r from-purple-50 to-[#8B1538]/5 rounded-2xl p-8 border border-purple-100">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                Need Help Planning?
              </h2>
              <p className="text-gray-600 mb-6">
                Our recommendations come straight from local knowledge and direct relationships
                with Walla Walla wineries. Tell us what you&apos;re looking for and we&apos;ll
                point you in the right direction.
              </p>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1538] text-white font-semibold rounded-xl hover:bg-[#722F37] transition-colors"
              >
                Get Personalized Recommendations
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
