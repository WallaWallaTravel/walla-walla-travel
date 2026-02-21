import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eventsService } from '@/lib/services/events.service';
import { EventCard } from '@/components/events/EventCard';
import { getCanonicalUrl } from '@/lib/utils/domain';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await eventsService.getBySlug(slug);

  if (!event) {
    return { title: 'Event Not Found' };
  }

  const canonical = await getCanonicalUrl(`/events/${slug}`);

  return {
    title: event.meta_title || `${event.title} | Walla Walla Events`,
    description: event.meta_description || event.short_description || event.description.substring(0, 160),
    alternates: {
      canonical,
    },
    openGraph: {
      title: event.meta_title || event.title,
      description: event.meta_description || event.short_description || undefined,
      type: 'article',
      images: event.featured_image_url ? [{ url: event.featured_image_url }] : undefined,
    },
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatPrice(event: { is_free: boolean; price_min: number | null; price_max: number | null }): string {
  if (event.is_free) return 'Free';
  if (event.price_min && event.price_max && event.price_min !== event.price_max) {
    return `$${event.price_min} - $${event.price_max}`;
  }
  if (event.price_min) return `$${event.price_min}`;
  if (event.price_max) return `$${event.price_max}`;
  return 'See details';
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await eventsService.getBySlug(slug);

  if (!event) {
    notFound();
  }

  // Track view (fire and forget)
  eventsService.trackView(event.id).catch(() => {});

  // Get related events (same category)
  const relatedEvents = event.category_slug
    ? (await eventsService.getByCategory(event.category_slug, 3, 0)).data.filter(
        (e) => e.id !== event.id
      )
    : [];

  // JSON-LD structured data
  const canonical = await getCanonicalUrl(`/events/${slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.short_description || event.description.substring(0, 200),
    url: canonical,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    startDate: event.start_time
      ? `${event.start_date}T${event.start_time}`
      : event.start_date,
    endDate: event.end_date
      ? event.end_time
        ? `${event.end_date}T${event.end_time}`
        : event.end_date
      : undefined,
    location: event.venue_name
      ? {
          '@type': 'Place',
          name: event.venue_name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.address || undefined,
            addressLocality: event.city,
            addressRegion: event.state,
            postalCode: event.zip || undefined,
          },
        }
      : undefined,
    image: event.featured_image_url || undefined,
    isAccessibleForFree: event.is_free,
    offers: !event.is_free && event.ticket_url
      ? {
          '@type': 'Offer',
          url: event.ticket_url,
          price: event.price_min || undefined,
          priceCurrency: 'USD',
        }
      : undefined,
    organizer: event.organizer_name
      ? {
          '@type': 'Organization',
          name: event.organizer_name,
          url: event.organizer_website || undefined,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* Hero Image */}
        <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-[#8B1538]/20 to-[#8B1538]/5">
          {event.featured_image_url ? (
            <img
              src={event.featured_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-20 h-20 text-[#8B1538]/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          {/* Main Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Category Badge */}
              {event.category_name && (
                <Link
                  href={`/events/category/${event.category_slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B1538]/10 text-[#8B1538] text-sm font-medium mb-4 hover:bg-[#8B1538]/20 transition-colors"
                >
                  {event.category_icon && <span>{event.category_icon}</span>}
                  {event.category_name}
                </Link>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {event.title}
              </h1>

              {/* Date & Time */}
              <div className="flex flex-wrap gap-4 mb-6 text-gray-700">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {formatDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date && (
                      <> &ndash; {formatDate(event.end_date)}</>
                    )}
                  </span>
                </div>

                {!event.is_all_day && event.start_time && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {formatTime(event.start_time)}
                      {event.end_time && <> &ndash; {formatTime(event.end_time)}</>}
                    </span>
                  </div>
                )}
              </div>

              {/* Venue */}
              {event.venue_name && (
                <div className="flex items-start gap-2 mb-6 text-gray-700">
                  <svg
                    className="w-5 h-5 text-gray-500 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">{event.venue_name}</p>
                    {event.address && (
                      <p className="text-sm text-gray-600">
                        {event.address}
                        {event.city && `, ${event.city}`}
                        {event.state && `, ${event.state}`}
                        {event.zip && ` ${event.zip}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Price & Ticket */}
              <div className="flex items-center gap-4 mb-8">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    event.is_free
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {formatPrice(event)}
                </span>
                {event.ticket_url && (
                  <a
                    href={event.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B1538] text-white font-medium hover:bg-[#722F37] transition-colors"
                  >
                    Get Tickets
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>

              {/* Description */}
              <div className="prose prose-gray max-w-none mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Event</h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </div>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Organizer Info */}
            {event.organizer_name && (
              <div className="border-t border-gray-200 p-6 sm:p-8 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Organizer</h2>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#8B1538]/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg text-[#8B1538] font-bold">
                      {event.organizer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{event.organizer_name}</p>
                    {event.organizer_website && (
                      <a
                        href={event.organizer_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#8B1538] hover:underline"
                      >
                        Website
                      </a>
                    )}
                    {event.organizer_email && (
                      <p className="text-sm text-gray-600 mt-1">
                        <a href={`mailto:${event.organizer_email}`} className="hover:underline">
                          {event.organizer_email}
                        </a>
                      </p>
                    )}
                    {event.organizer_phone && (
                      <p className="text-sm text-gray-600">
                        <a href={`tel:${event.organizer_phone}`} className="hover:underline">
                          {event.organizer_phone}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back link */}
          <div className="mt-6 mb-8">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to all events
            </Link>
          </div>
        </div>

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <section className="bg-gray-50 py-12 mt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">More {event.category_name} Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedEvents.map((related) => (
                  <EventCard key={related.id} event={related} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cross-Promotion */}
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-700 mb-3">
              Attending an event in Walla Walla? Make it a trip.
            </p>
            <a
              href="https://wallawalla.travel/plan-your-visit"
              className="text-[#8B1538] font-medium hover:underline"
            >
              Plan your visit to wine country &rarr;
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
