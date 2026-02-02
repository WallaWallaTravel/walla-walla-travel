import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getItineraryBySlug, getAllItinerarySlugs, getAllItineraries } from '@/lib/data/itineraries';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';
import { FAQSection } from '@/components/FAQSection';

// Generate static params for all itineraries
export async function generateStaticParams() {
  const slugs = getAllItinerarySlugs();
  return slugs.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const itinerary = getItineraryBySlug(slug);

  if (!itinerary) {
    return {
      title: 'Itinerary Not Found',
    };
  }

  return {
    title: itinerary.title,
    description: itinerary.metaDescription,
    keywords: [
      itinerary.title,
      'Walla Walla itinerary',
      'wine tour planning',
      'wine country trip',
    ],
    openGraph: {
      title: itinerary.title,
      description: itinerary.metaDescription,
      type: 'article',
      url: `https://wallawalla.travel/itineraries/${slug}`,
    },
    alternates: {
      canonical: `https://wallawalla.travel/itineraries/${slug}`,
    },
  };
}

// Itinerary icons
const itineraryIcons: Record<string, string> = {
  'weekend-getaway': '🗓️',
  'first-timers': '🌟',
  'romantic-escape': '💕',
};

// Stop type icons
const stopTypeIcons: Record<string, string> = {
  winery: '🍷',
  restaurant: '🍽️',
  activity: '⭐',
  lodging: '🏨',
};

export default async function ItineraryPage({ params }: PageProps) {
  const { slug } = await params;
  const itinerary = getItineraryBySlug(slug);

  if (!itinerary) {
    notFound();
  }

  const allItineraries = getAllItineraries();
  const otherItineraries = allItineraries.filter((i) => i.slug !== slug);

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Itineraries', url: 'https://wallawalla.travel/itineraries' },
    { name: itinerary.shortTitle, url: `https://wallawalla.travel/itineraries/${slug}` },
  ];

  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={itinerary.faqs} pageUrl={`https://wallawalla.travel/itineraries/${slug}`} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-6xl mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/itineraries" className="text-white/70 hover:text-white">
                Itineraries
              </Link>
              <span className="text-white/50">/</span>
              <span className="text-white">{itinerary.shortTitle}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{itineraryIcons[slug] || '📋'}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold">
                  {itinerary.title}
                </h1>
              </div>
            </div>

            <p className="text-xl text-white/90 max-w-2xl mb-6">
              {itinerary.description}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {itinerary.duration}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {itinerary.idealGroupSize}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {itinerary.estimatedCost}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-10">
              {/* Best For */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-medium text-gray-700">Best for:</span>
                {itinerary.bestFor.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#8B1538]/10 text-[#8B1538] rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Day-by-Day */}
              {itinerary.days.map((day) => (
                <section key={day.dayNumber} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {day.dayNumber}
                      </div>
                      <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900">
                          Day {day.dayNumber}: {day.title}
                        </h2>
                        <p className="text-gray-600">{day.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="p-6">
                    <div className="space-y-6">
                      {day.stops.map((stop, index) => (
                        <div key={index} className="flex gap-4">
                          {/* Time */}
                          <div className="w-20 flex-shrink-0 text-sm text-gray-500 font-medium pt-1">
                            {stop.time}
                          </div>

                          {/* Icon */}
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{stopTypeIcons[stop.type]}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{stop.name}</h3>
                            <p className="text-gray-600 text-sm mt-1">{stop.description}</p>
                            {stop.tip && (
                              <p className="text-[#8B1538] text-sm mt-2 flex items-start gap-1">
                                <span>💡</span>
                                <span className="italic">{stop.tip}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}

              {/* Tips Section */}
              <section className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <h2 className="text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <span>💡</span>
                  Pro Tips for This Trip
                </h2>
                <ul className="space-y-3">
                  {itinerary.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-amber-600 mt-1">•</span>
                      <span className="text-amber-800">{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* FAQ Section */}
              <FAQSection
                faqs={itinerary.faqs}
                className="mt-12 pt-8 border-t border-gray-200"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Love This Itinerary?
                </h3>
                <p className="text-gray-600 mb-6">
                  We can help you book this exact trip or customize it for your group.
                </p>

                <Link
                  href={`/my-trips/new?template=${slug}`}
                  className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors mb-3"
                >
                  Use This Itinerary
                </Link>

                <Link
                  href="/inquiry"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors mb-3"
                >
                  Book This Trip
                </Link>

                <Link
                  href="/wineries"
                  className="block w-full text-gray-500 text-center py-2 text-sm hover:text-[#8B1538] transition-colors"
                >
                  Browse Wineries
                </Link>

                {/* Quick Info */}
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{itinerary.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Group Size</span>
                    <span className="font-medium">{itinerary.idealGroupSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated Cost</span>
                    <span className="font-medium">{itinerary.estimatedCost}</span>
                  </div>
                </div>
              </div>

              {/* Explore by District */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Explore by District
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/neighborhoods/downtown" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Downtown</Link>
                  <Link href="/neighborhoods/airport-district" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Airport</Link>
                  <Link href="/neighborhoods/southside" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Southside</Link>
                  <Link href="/neighborhoods/westside" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Westside</Link>
                </div>
                <Link href="/neighborhoods" className="block mt-3 text-xs text-[#8B1538] font-medium hover:underline">
                  View All Districts →
                </Link>
              </div>

              {/* Other Itineraries */}
              {otherItineraries.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    More Itineraries
                  </h3>
                  <div className="space-y-3">
                    {otherItineraries.map((other) => (
                      <Link
                        key={other.slug}
                        href={`/itineraries/${other.slug}`}
                        className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{itineraryIcons[other.slug] || '📋'}</span>
                          <div>
                            <span className="font-medium text-gray-900">{other.shortTitle}</span>
                            <span className="block text-xs text-gray-500">{other.duration}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
