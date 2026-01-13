import { Metadata } from 'next';
import Link from 'next/link';
import { getAllItineraries } from '@/lib/data/itineraries';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Walla Walla Wine Tour Itineraries',
  description:
    'Sample itineraries for your Walla Walla wine country trip. Weekend getaways, first-timer guides, and romantic escapes with day-by-day planning.',
  keywords: [
    'Walla Walla itinerary',
    'wine tour planning',
    'wine country trip',
    'weekend wine getaway',
    'Walla Walla trip ideas',
  ],
  openGraph: {
    title: 'Walla Walla Wine Tour Itineraries',
    description: 'Day-by-day trip plans for your perfect wine country visit.',
    type: 'website',
    url: 'https://wallawalla.travel/itineraries',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/itineraries',
  },
};

// Itinerary icons
const itineraryIcons: Record<string, string> = {
  'weekend-getaway': '🗓️',
  'first-timers': '🌟',
  'romantic-escape': '💕',
};

export default function ItinerariesIndexPage() {
  const itineraries = getAllItineraries();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Itineraries', url: 'https://wallawalla.travel/itineraries' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero with background image */}
        <PageHero
          title="Sample Itineraries"
          description="Ready-to-use trip plans for your Walla Walla wine country adventure. Choose a template and customize it for your group."
          backLink={{ href: '/', label: 'Back to Home' }}
        />

        {/* Itineraries Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {itineraries.map((itinerary) => (
              <Link
                key={itinerary.slug}
                href={`/itineraries/${itinerary.slug}`}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Icon Header */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 border-b border-gray-100 flex items-center justify-center">
                  <span className="text-6xl">{itineraryIcons[itinerary.slug] || '📋'}</span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>{itinerary.duration}</span>
                    <span>•</span>
                    <span>{itinerary.idealGroupSize}</span>
                  </div>

                  <h2 className="text-xl font-serif font-bold text-gray-900 group-hover:text-[#8B1538] transition-colors mb-2">
                    {itinerary.shortTitle}
                  </h2>

                  <p className="text-gray-600 mb-4">{itinerary.description}</p>

                  {/* Best For Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {itinerary.bestFor.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center text-[#8B1538] font-medium group-hover:gap-3 gap-2 transition-all">
                    <span>View Itinerary</span>
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

          {/* Custom Planning CTA */}
          <div className="mt-16 bg-gradient-to-r from-[#722F37] to-[#8B1538] rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-serif font-bold mb-4">
                  Want a Custom Itinerary?
                </h2>
                <p className="text-white/90 mb-4">
                  Our team can create a personalized wine tour based on your preferences,
                  group size, and interests. We know the winemakers, the back roads, and
                  the experiences you can&apos;t book online.
                </p>
                <ul className="text-sm text-white/80 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Personalized recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Reservations handled for you
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Private transportation available
                  </li>
                </ul>
              </div>
              <div className="flex-shrink-0">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-white text-[#8B1538] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  Plan Custom Trip
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
        </div>
      </div>
    </>
  );
}
