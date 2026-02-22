import type { EventWithCategory } from '@/lib/types/events';

interface EventJsonLdProps {
  event: EventWithCategory;
  url?: string;
}

export function EventJsonLd({ event, url }: EventJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': url || undefined,
    name: event.title,
    description: event.short_description || event.description.substring(0, 200),
    url: url || undefined,
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

  // Remove undefined values for cleaner output
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd, null, 0) }}
    />
  );
}
