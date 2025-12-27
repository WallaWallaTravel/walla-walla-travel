/**
 * Cancellation Policy - Single Source of Truth
 *
 * Used by: Proposals, booking confirmations, terms pages
 * Applies to: All bookings through WWT and NW Touring
 */

export interface CancellationTier {
  id: string;
  label: string;
  daysBeforeTour: string;
  refundPercentage: number;
  description: string;
  icon: string;
  colorClass: string;
}

export const CANCELLATION_TIERS: CancellationTier[] = [
  {
    id: 'full_refund',
    label: '30+ days before',
    daysBeforeTour: '30+',
    refundPercentage: 100,
    description: 'Cancel at least 30 days before your scheduled tour date and receive a complete refund of your deposit and any payments made. No questions asked.',
    icon: '✅',
    colorClass: 'green',
  },
  {
    id: 'partial_refund',
    label: '15-29 days before',
    daysBeforeTour: '15-29',
    refundPercentage: 50,
    description: 'Cancellations made 15-29 days before your tour will receive a 50% refund. At this point, we have likely declined other bookings for your date and made reservations on your behalf.',
    icon: '⚠️',
    colorClass: 'yellow',
  },
  {
    id: 'no_refund',
    label: 'Less than 15 days',
    daysBeforeTour: '<15',
    refundPercentage: 0,
    description: 'Cancellations within 15 days of your tour are non-refundable. However, you may transfer your reservation to another party or reschedule to another available date (one-time, subject to availability).',
    icon: '❌',
    colorClass: 'red',
  },
];

export const CANCELLATION_POLICY = {
  version: '1.0',
  lastUpdated: '2025-12-25',
  tiers: CANCELLATION_TIERS,

  quickSummary: [
    { days: '30+ days before', refund: 'Full refund', icon: '✅' },
    { days: '15-29 days before', refund: '50% refund', icon: '⚠️' },
    { days: 'Less than 15 days', refund: 'No refund (transfer/reschedule available)', icon: '❌' },
    { days: 'Weather cancellation', refund: 'Full refund or reschedule', icon: '🌤️' },
  ],

  sections: {
    timeline: {
      title: 'Cancellation Timeline',
      content: CANCELLATION_TIERS,
    },

    weatherAndEmergencies: {
      title: 'Weather and Emergencies',
      severeWeather: {
        title: 'Severe Weather',
        description: 'If conditions are unsafe for travel (heavy snow, ice, flooding, etc.), we will contact you to reschedule your tour at no additional charge or provide a full refund. The decision to cancel due to weather is at our discretion for safety reasons.',
      },
      emergencies: {
        title: 'Emergencies',
        description: 'We understand that true emergencies happen (medical, family, etc.). Contact us immediately and we will work with you on a case-by-case basis to find a fair solution.',
      },
    },

    cancellationByProvider: {
      title: 'Cancellation by Service Provider',
      description: 'If we need to cancel your tour due to vehicle breakdown, driver illness, or circumstances beyond our control, you will receive a full refund or the option to reschedule at no additional charge.',
    },

    noShows: {
      title: 'No-Shows and Late Arrivals',
      noShow: 'If you do not show up for your scheduled tour and do not contact us, your reservation is considered a no-show and is non-refundable.',
      lateArrival: 'If you arrive late, we will do our best to accommodate the remaining itinerary. However, no refunds or credits will be provided for missed portions of the tour due to late arrival.',
      tip: 'Save our phone number and call if you are running late! We are understanding and flexible.',
    },

    modifications: {
      title: 'Modifications vs. Cancellations',
      intro: 'Need to change your plans but not cancel? Modifications are different from cancellations:',
      items: [
        {
          type: 'Party Size Changes',
          description: 'Let us know as soon as possible. Additional guests may incur extra charges; reducing party size may not reduce cost if vehicle/reservations are already set.',
        },
        {
          type: 'Date Changes',
          description: 'Rescheduling is generally free if done more than 30 days in advance (subject to availability).',
        },
        {
          type: 'Itinerary Changes',
          description: 'We can adjust wineries, timing, etc. up to 48 hours before your tour at no charge.',
        },
      ],
    },

    refundProcessing: {
      title: 'Refund Processing',
      timeline: 'Approved refunds will be processed within 5-7 business days.',
      methods: [
        { method: 'Card payments', description: 'Refunded to card (may take 5-10 business days to appear)' },
        { method: 'Check payments', description: 'Refund check mailed to billing address' },
      ],
    },

    groupBookings: {
      title: 'Group and Corporate Bookings',
      description: 'Large group bookings (8+ guests) or corporate events may have custom cancellation terms agreed upon at booking. Please refer to your booking confirmation for specific terms.',
    },
  },

  contact: {
    email: 'info@wallawalla.travel',
    phone: '509-200-8000',
    responseTime: 'Usually within 2 hours during business hours',
  },
};

/**
 * Calculate refund amount based on days before tour
 */
export function calculateRefundPercentage(daysBeforeTour: number): number {
  if (daysBeforeTour >= 30) return 100;
  if (daysBeforeTour >= 15) return 50;
  return 0;
}

/**
 * Get the applicable cancellation tier
 */
export function getCancellationTier(daysBeforeTour: number): CancellationTier {
  if (daysBeforeTour >= 30) return CANCELLATION_TIERS[0];
  if (daysBeforeTour >= 15) return CANCELLATION_TIERS[1];
  return CANCELLATION_TIERS[2];
}

/**
 * Calculate days between now and tour date
 */
export function getDaysUntilTour(tourDate: Date | string): number {
  const tour = typeof tourDate === 'string' ? new Date(tourDate) : tourDate;
  const now = new Date();
  const diffTime = tour.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a booking can be cancelled with refund
 */
export function canCancelWithRefund(tourDate: Date | string): boolean {
  return getDaysUntilTour(tourDate) >= 15;
}

/**
 * Get formatted cancellation policy text for display
 */
export function getCancellationPolicySummaryText(): string {
  return `Cancellation Policy: Full refund 30+ days before tour. 50% refund 15-29 days before. No refund within 15 days (transfer/reschedule available). Weather cancellations receive full refund.`;
}
