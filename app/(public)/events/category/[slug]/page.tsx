import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eventsService } from '@/lib/services/events.service';
import { EventCard } from '@/components/events/EventCard';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await eventsService.getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${category.name} Events in Walla Walla | Walla Walla Events`,
    description: category.description || `Browse ${category.name.toLowerCase()} events happening in Walla Walla, Washington.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function CategoryEventsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const category = await eventsService.getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  const events = await eventsService.getByCategory(slug, limit, offset);
  const totalPages = Math.ceil(events.total / limit);

  return (
    <div className="min-h-screen bg-white">
      {/* Category Header */}
      <section className="bg-gradient-to-br from-[#8B1538]/5 via-white to-[#8B1538]/5 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Events
          </Link>
          <div className="flex items-center gap-3 mb-3">
            {category.icon && <span className="text-4xl">{category.icon}</span>}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{category.name}</h1>
          </div>
          {category.description && (
            <p className="text-lg text-gray-700 max-w-2xl">{category.description}</p>
          )}
          <p className="text-sm text-gray-600 mt-3">
            {events.total} upcoming event{events.total !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                    href={`/events/category/${slug}?page=${page - 1}`}
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
                    href={`/events/category/${slug}?page=${page + 1}`}
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
              {category.icon ? (
                <span className="text-2xl">{category.icon}</span>
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {category.name.toLowerCase()} events yet
            </h3>
            <p className="text-gray-600 mb-6">
              Check back soon for upcoming {category.name.toLowerCase()} events in Walla Walla.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[#8B1538] text-white font-medium hover:bg-[#722F37] transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
