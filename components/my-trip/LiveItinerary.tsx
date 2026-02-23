'use client';

import type {
  TripProposalFull,
  TripProposalDay,
  TripProposalStop,
  StopType,
  PlanningPhase,
} from '@/lib/types/trip-proposal';

// ---------------------------------------------------------------------------
// Stop Type Icons (inline SVGs to avoid heavy icon library dependencies)
// ---------------------------------------------------------------------------

function MapPinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function WineIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6l1.5 9h9L18 6M6 6h12M9.5 15v4.5m5-4.5v4.5M8 19.5h8"
      />
    </svg>
  );
}

function UtensilsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m18-12.75H3"
      />
    </svg>
  );
}

function HotelIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M15.75 21H8.25m6.75-18.952h-5.379c-.621 0-1.125.504-1.125 1.125v17.16"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.971 1.816A5.23 5.23 0 0 1 14.25 3.272M16.5 21V7.875"
      />
    </svg>
  );
}

function StarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

function CircleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function NoteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STOP_TYPE_CONFIG: Record<
  StopType,
  { icon: React.FC<{ className?: string }>; label: string; color: string }
> = {
  pickup: { icon: MapPinIcon, label: 'Pickup', color: 'text-blue-600' },
  winery: { icon: WineIcon, label: 'Winery', color: 'text-purple-700' },
  restaurant: {
    icon: UtensilsIcon,
    label: 'Restaurant',
    color: 'text-amber-700',
  },
  hotel_checkin: {
    icon: HotelIcon,
    label: 'Hotel Check-in',
    color: 'text-indigo-600',
  },
  hotel_checkout: {
    icon: HotelIcon,
    label: 'Hotel Checkout',
    color: 'text-indigo-600',
  },
  activity: { icon: StarIcon, label: 'Activity', color: 'text-emerald-600' },
  dropoff: { icon: MapPinIcon, label: 'Drop-off', color: 'text-blue-600' },
  custom: { icon: CircleIcon, label: 'Stop', color: 'text-gray-600' },
};

function getStopName(stop: TripProposalStop): string {
  if (stop.winery?.name) return stop.winery.name;
  if (stop.restaurant?.name) return stop.restaurant.name;
  if (stop.hotel?.name) return stop.hotel.name;
  if (stop.custom_name) return stop.custom_name;

  return STOP_TYPE_CONFIG[stop.stop_type]?.label || 'Stop';
}

function getStopSubtitle(stop: TripProposalStop): string | null {
  if (stop.winery?.city) return stop.winery.city;
  if (stop.restaurant?.cuisine_type) return stop.restaurant.cuisine_type;
  if (stop.hotel?.type) return stop.hotel.type;
  if (stop.custom_address) return stop.custom_address;
  return null;
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  // Input is "HH:MM" — convert to 12-hour
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StopCard({
  stop,
  showNoteIcon,
}: {
  stop: TripProposalStop;
  showNoteIcon: boolean;
}) {
  const config = STOP_TYPE_CONFIG[stop.stop_type] || STOP_TYPE_CONFIG.custom;
  const Icon = config.icon;
  const name = getStopName(stop);
  const subtitle = getStopSubtitle(stop);
  const time = formatTime(stop.scheduled_time);

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Timeline dot and icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center ${config.color}`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {name}
          </span>
          {showNoteIcon && (
            <button
              type="button"
              className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
              title="Add note"
              aria-label={`Add note to ${name}`}
            >
              <NoteIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{subtitle}</p>
        )}

        {/* Time and duration */}
        <div className="flex items-center gap-3 mt-1">
          {time && (
            <span className="text-xs text-gray-600">{time}</span>
          )}
          {stop.duration_minutes != null && stop.duration_minutes > 0 && (
            <span className="text-xs text-gray-600">
              {stop.duration_minutes >= 60
                ? `${Math.floor(stop.duration_minutes / 60)}h${stop.duration_minutes % 60 > 0 ? ` ${stop.duration_minutes % 60}m` : ''}`
                : `${stop.duration_minutes}m`}
            </span>
          )}
        </div>

        {/* Client notes */}
        {stop.client_notes && (
          <p className="text-xs text-gray-700 mt-1.5 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">
            {stop.client_notes}
          </p>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  showNoteIcons,
}: {
  day: TripProposalDay & { stops: TripProposalStop[] };
  showNoteIcons: boolean;
}) {
  const sortedStops = [...(day.stops || [])].sort(
    (a, b) => a.stop_order - b.stop_order
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Day header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Day {day.day_number}
              </span>
              {showNoteIcons && (
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Add note for this day"
                  aria-label={`Add note for Day ${day.day_number}`}
                >
                  <NoteIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {day.title && (
              <h3 className="text-base font-semibold text-gray-900 mt-0.5">
                {day.title}
              </h3>
            )}
            <p className="text-sm text-gray-600 mt-0.5">
              {formatDate(day.date)}
            </p>
          </div>
        </div>

        {day.description && (
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">
            {day.description}
          </p>
        )}

        {day.notes && (
          <p className="text-sm text-gray-700 mt-2 leading-relaxed bg-gray-50 rounded px-3 py-2">
            {day.notes}
          </p>
        )}
      </div>

      {/* Stops list */}
      <div className="px-5 py-2 divide-y divide-gray-100">
        {sortedStops.length > 0 ? (
          sortedStops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              showNoteIcon={showNoteIcons}
            />
          ))
        ) : (
          <p className="py-4 text-sm text-gray-600 text-center">
            No stops scheduled for this day yet.
          </p>
        )}
      </div>
    </div>
  );
}

function PricingBreakdown({ proposal }: { proposal: TripProposalFull }) {
  const hasDiscount =
    proposal.discount_amount > 0 || proposal.discount_percentage > 0;
  const hasTax = proposal.taxes > 0;
  const hasGratuity = proposal.gratuity_amount > 0;

  // Show inclusions that are marked visible
  const visibleInclusions = (proposal.inclusions || []).filter(
    (inc) => inc.show_on_proposal
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">
          Pricing Summary
        </h3>
      </div>
      <div className="px-5 py-4">
        {/* Included services */}
        {visibleInclusions.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Included Services
            </p>
            <ul className="space-y-1.5">
              {visibleInclusions.map((inc) => (
                <li
                  key={inc.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{inc.description}</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(inc.total_price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">
              {formatCurrency(proposal.subtotal)}
            </span>
          </div>

          {hasDiscount && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Discount
                {proposal.discount_percentage > 0 &&
                  ` (${proposal.discount_percentage}%)`}
                {proposal.discount_reason && (
                  <span className="ml-1 text-gray-500">
                    — {proposal.discount_reason}
                  </span>
                )}
              </span>
              <span className="text-emerald-700">
                -{formatCurrency(proposal.discount_amount)}
              </span>
            </div>
          )}

          {hasTax && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Tax ({(proposal.tax_rate * 100).toFixed(1)}%)
              </span>
              <span className="text-gray-900">
                {formatCurrency(proposal.taxes)}
              </span>
            </div>
          )}

          {hasGratuity && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Gratuity ({proposal.gratuity_percentage}%)
              </span>
              <span className="text-gray-900">
                {formatCurrency(proposal.gratuity_amount)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-900">
              Total
            </span>
            <span className="text-base font-semibold text-gray-900">
              {formatCurrency(proposal.total)}
            </span>
          </div>

          {proposal.deposit_amount > 0 && (
            <div className="flex justify-between text-sm pt-1">
              <span className="text-gray-600">
                Deposit ({proposal.deposit_percentage}%)
              </span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(proposal.deposit_amount)}
              </span>
            </div>
          )}

          {proposal.deposit_paid && proposal.balance_due > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Balance Due</span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(proposal.balance_due)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface LiveItineraryProps {
  proposal: TripProposalFull;
  planningPhase: PlanningPhase;
}

export function LiveItinerary({ proposal, planningPhase }: LiveItineraryProps) {
  const sortedDays = [...(proposal.days || [])].sort(
    (a, b) => a.day_number - b.day_number
  );

  const isMultiDay = sortedDays.length > 1;
  const showNoteIcons = planningPhase === 'active_planning';

  const dateRange = isMultiDay
    ? `${formatDate(proposal.start_date)}${proposal.end_date ? ` — ${formatDate(proposal.end_date)}` : ''}`
    : formatDate(proposal.start_date);

  return (
    <div className="space-y-6">
      {/* Trip overview card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {proposal.trip_title || 'Your Trip'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{dateRange}</p>
            <p className="text-sm text-gray-700 mt-1">
              {proposal.party_size}{' '}
              {proposal.party_size === 1 ? 'guest' : 'guests'}
            </p>
          </div>

          {planningPhase === 'finalized' && (
            <span className="inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Finalized
            </span>
          )}
        </div>

        {/* Introduction text */}
        {proposal.introduction && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {proposal.introduction}
            </p>
          </div>
        )}

        {/* Special notes */}
        {proposal.special_notes && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800 leading-relaxed">
              {proposal.special_notes}
            </p>
          </div>
        )}
      </div>

      {/* Day cards */}
      {sortedDays.length > 0 ? (
        sortedDays.map((day) => (
          <DayCard key={day.id} day={day} showNoteIcons={showNoteIcons} />
        ))
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <svg
            className="w-12 h-12 text-gray-500 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            No itinerary yet
          </h3>
          <p className="text-sm text-gray-700">
            Your itinerary is being prepared. Check back soon for details.
          </p>
        </div>
      )}

      {/* Pricing breakdown */}
      {proposal.total > 0 && <PricingBreakdown proposal={proposal} />}

      {/* Validity notice */}
      {proposal.valid_until && planningPhase === 'proposal' && (
        <p className="text-xs text-gray-600 text-center">
          This proposal is valid until{' '}
          {new Date(proposal.valid_until + 'T00:00:00').toLocaleDateString(
            'en-US',
            { month: 'long', day: 'numeric', year: 'numeric' }
          )}
          .
        </p>
      )}
    </div>
  );
}
