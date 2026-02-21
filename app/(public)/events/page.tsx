import { Metadata } from 'next';
import Link from 'next/link';
import { eventsService } from '@/lib/services/events.service';
import { EventCard } from '@/components/events/EventCard';
import { CategoryGrid } from '@/components/events/CategoryGrid';
import { EventsSearchBar } from '@/components/events/EventsSearchBar';

export const metadata: Metadata = {
  title: 'Events in Walla Walla | Walla Walla Events',
  description:
    'Discover upcoming events in Walla Walla, Washington — wine tastings, festivals, live music, art, dining, and more.',
  openGraph: {
    title: 'Events in Walla Walla',
    description:
      'Discover upcoming events in Walla Walla, Washington — wine tastings, festivals, live music, art, dining, and more.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function EventsHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const free = params.free === 'true' ? true : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  const [featured, categories, events] = await Promise.all([
    eventsService.getFeatured(4),
    eventsService.getCategories(),
    eventsService.listPublished({
      category,
      search,
      isFree: free,
      limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(events.total / limit);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#8B1538]/5 via-white to-[#8B1538]/5 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Discover What&apos;s Happening in Walla Walla
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
            Wine tastings, festivals, live music, art, dining events, and more in Washington&apos;s
            premier wine country.
          </p>
          <EventsSearchBar />
        </div>
      </section>

      {/* Featured Events */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Events</h2>
            <span className="text-sm font-medium text-[#8B1538]">Editor&apos;s Picks</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Category Grid */}
      <section id="categories" className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Browse by Category
          </h2>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* Upcoming Events List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {search
              ? `Results for "${search}"`
              : category
                ? 'Filtered Events'
                : 'Upcoming Events'}
          </h2>
          <p className="text-sm text-gray-600">
            {events.total} event{events.total !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Active filters */}
        {(search || category || free) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                Search: {search}
                <Link href="/events" className="ml-1 text-gray-500 hover:text-gray-700">
                  &times;
                </Link>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                Category: {category}
                <Link href="/events" className="ml-1 text-gray-500 hover:text-gray-700">
                  &times;
                </Link>
              </span>
            )}
            {free && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-sm text-emerald-800">
                Free events only
                <Link href="/events" className="ml-1 text-emerald-600 hover:text-emerald-800">
                  &times;
                </Link>
              </span>
            )}
            <Link href="/events" className="text-sm text-[#8B1538] hover:underline">
              Clear all
            </Link>
          </div>
        )}

        {events.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {page > 1 && (
                  <Link
                    href={`/events?page=${page - 1}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}${free ? '&free=true' : ''}`}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  >
                    Previous
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/events?page=${page + 1}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}${free ? '&free=true' : ''}`}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              {search
                ? 'Try adjusting your search or filters.'
                : 'Check back soon for upcoming events in Walla Walla.'}
            </p>
            {(search || category || free) && (
              <Link
                href="/events"
                className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[#8B1538] text-white font-medium hover:bg-[#722F37] transition-colors"
              >
                View All Events
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Cross-Promotion */}
      <section className="bg-[#8B1538]/5 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Planning a Visit?</h2>
          <p className="text-gray-700 mb-6">
            Explore Walla Walla&apos;s world-class wineries, book a wine tour, and plan your perfect
            trip to Washington&apos;s wine country.
          </p>
          <a
            href="https://wallawalla.travel/plan-your-visit"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[#8B1538] text-white font-semibold hover:bg-[#722F37] transition-colors"
          >
            Plan Your Visit
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
