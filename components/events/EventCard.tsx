import Link from 'next/link';
import type { EventWithCategory } from '@/lib/types/events';

interface EventCardProps {
  event: EventWithCategory;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatPrice(event: EventWithCategory): { label: string; isFree: boolean } {
  if (event.is_free) {
    return { label: 'Free', isFree: true };
  }
  if (event.price_min != null && event.price_max != null && event.price_min !== event.price_max) {
    return { label: `$${event.price_min} - $${event.price_max}`, isFree: false };
  }
  if (event.price_min != null) {
    return { label: `$${event.price_min}`, isFree: false };
  }
  if (event.price_max != null) {
    return { label: `$${event.price_max}`, isFree: false };
  }
  return { label: '', isFree: false };
}

const CATEGORY_ICONS: Record<string, string> = {
  wine: '\uD83C\uDF77',
  music: '\uD83C\uDFB5',
  food: '\uD83C\uDF7D\uFE0F',
  arts: '\uD83C\uDFA8',
  outdoor: '\uD83C\uDFDE\uFE0F',
  festival: '\uD83C\uDF89',
  community: '\uD83E\uDD1D',
  sports: '\u26BD',
  education: '\uD83D\uDCDA',
  family: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
};

function getCategoryIcon(iconName: string | null, categorySlug: string | null): string {
  if (iconName) return iconName;
  if (categorySlug && CATEGORY_ICONS[categorySlug]) return CATEGORY_ICONS[categorySlug];
  return '\uD83D\uDCC5';
}

export function EventCard({ event }: EventCardProps) {
  const price = formatPrice(event);
  const categoryIcon = getCategoryIcon(event.category_icon, event.category_slug);

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <article className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white">
        {/* Image */}
        <div className="aspect-[16/9] relative overflow-hidden">
          {event.featured_image_url ? (
            <img
              src={event.featured_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#8B1538]/20 to-[#8B1538]/5 flex items-center justify-center">
              <span className="text-4xl">{categoryIcon}</span>
            </div>
          )}

          {/* Category Badge */}
          {event.category_name && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
              <span>{categoryIcon}</span>
              {event.category_name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#8B1538] transition-colors line-clamp-2">
            {event.title}
          </h3>

          {/* Date & Time */}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-700">
            <svg
              className="w-4 h-4 text-gray-500 shrink-0"
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
            <span>{formatDate(event.start_date)}</span>
            {event.start_time && (
              <span className="text-gray-500">at {formatTime(event.start_time)}</span>
            )}
          </div>

          {/* Venue */}
          {event.venue_name && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-700">
              <svg
                className="w-4 h-4 text-gray-500 shrink-0"
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
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}

          {/* Price */}
          {price.label && (
            <div className="mt-3">
              <span
                className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  price.isFree
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {price.label}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
