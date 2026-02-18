/**
 * NW Touring & Concierge - Complete Terms and Conditions
 *
 * Full standalone terms for direct NW Touring bookings (not through WWT).
 * Includes booking terms, cancellation policy, and liability provisions.
 *
 * Also applies to:
 * - Herding Cats Wine Tours (DBA)
 *
 * USDOT: 3603851 | MC: 1225087
 */

import { CANCELLATION_POLICY } from './cancellation-policy';
import {
  NW_TOURING_COMPANY_INFO,
  NW_TOURING_LIABILITY_SECTIONS,
  VEHICLE_DAMAGE_FEES,
} from './nw-touring-terms';

export interface TermsSection {
  id: string;
  number: string;
  title: string;
  content: string;
  subsections?: {
    id: string;
    label: string;
    content: string;
  }[];
}

// ============================================================================
// BOOKING & SERVICE TERMS (Sections 1-5)
// ============================================================================

export const NW_TOURING_BOOKING_SECTIONS: TermsSection[] = [
  {
    id: 'about_us',
    number: '1',
    title: 'About NW Touring & Concierge',
    content: 'NW Touring & Concierge LLC is an Oregon limited liability company operating as a licensed passenger motor carrier. We provide wine tour transportation, airport transfers, and charter services in the Walla Walla Valley, Columbia Valley, and surrounding Pacific Northwest wine regions.',
    subsections: [
      {
        id: 'regulatory',
        label: 'Regulatory Information',
        content: `USDOT Number: ${NW_TOURING_COMPANY_INFO.usdot} | MC Number: ${NW_TOURING_COMPANY_INFO.mc}. We maintain all required federal and state licenses, permits, and insurance for passenger motor carrier operations.`,
      },
      {
        id: 'dba',
        label: 'Doing Business As',
        content: 'NW Touring & Concierge also operates under the trade name "Herding Cats Wine Tours." All terms herein apply equally to services provided under any of our trade names.',
      },
    ],
  },
  {
    id: 'booking_reservations',
    number: '2',
    title: 'Booking and Reservations',
    content: 'By making a reservation with NW Touring & Concierge, you are entering into a contract for transportation services.',
    subsections: [
      {
        id: 'deposit',
        label: 'Deposit Requirements',
        content: 'A deposit is required to confirm your reservation. Standard deposit amounts: 1-7 guests: $250; 8-14 guests: $350; 15+ guests: Custom amount to be determined. Your reservation is not confirmed until we receive your deposit and send written confirmation.',
      },
      {
        id: 'confirmation',
        label: 'Confirmation',
        content: 'After receiving your deposit, we will send a booking confirmation with your itinerary details. Please review this confirmation carefully and notify us of any errors within 24 hours.',
      },
      {
        id: 'final_payment',
        label: 'Final Payment',
        content: 'Final payment is due within 48 hours after your tour concludes. Wine tours are billed based on actual tour duration at the applicable hourly rate. Your final invoice will include tour time, any additional services, and applicable taxes.',
      },
      {
        id: 'pricing',
        label: 'Pricing',
        content: 'Tour pricing is based on party size and vehicle requirements. Rates may vary based on day of week, season, and special events. All pricing is subject to applicable state and local taxes (currently 9.1% in Washington).',
      },
    ],
  },
  {
    id: 'services',
    number: '3',
    title: 'Services Provided',
    content: 'NW Touring & Concierge provides professional transportation services for wine tours and other activities.',
    subsections: [
      {
        id: 'included',
        label: 'What\'s Included',
        content: 'Our service includes: Professional, licensed driver; Safe, well-maintained vehicle; Pickup and drop-off at your specified location; Transportation between all tour destinations; Bottled water; Cooler for wine purchases.',
      },
      {
        id: 'not_included',
        label: 'What\'s Not Included',
        content: 'The following are not included in tour pricing and are the responsibility of guests: Wine tasting fees (typically $15-40 per person per winery); Meals and beverages; Gratuity for your driver (appreciated but not required); Wine purchases; Personal expenses.',
      },
      {
        id: 'itinerary',
        label: 'Itinerary Planning',
        content: 'We work with you to create a customized itinerary based on your preferences. We make winery reservations on your behalf when required. Final itinerary is subject to winery availability and hours of operation.',
      },
      {
        id: 'modifications',
        label: 'Itinerary Modifications',
        content: 'You may request changes to your itinerary up to 48 hours before your tour at no charge. Changes requested within 48 hours are subject to availability and may not be possible. On-the-day changes can be accommodated when possible but are not guaranteed.',
      },
    ],
  },
  {
    id: 'cancellation',
    number: '4',
    title: 'Cancellation and Refund Policy',
    content: 'We understand plans change. Our cancellation policy is designed to be fair while allowing us to manage our small business effectively.',
    subsections: [
      {
        id: 'thirty_plus',
        label: '30+ Days Before Tour',
        content: 'Full refund (100%). Cancel at least 30 days before your scheduled tour and receive a complete refund of your deposit and any payments made.',
      },
      {
        id: 'fifteen_to_twenty_nine',
        label: '15-29 Days Before Tour',
        content: '50% refund. At this point, we have likely declined other bookings for your date and made reservations on your behalf.',
      },
      {
        id: 'less_than_fifteen',
        label: 'Less Than 15 Days Before Tour',
        content: 'No refund. Cancellations within 15 days are non-refundable. However, you may: (a) Transfer your reservation to another party at no charge, or (b) Reschedule to another available date (one-time reschedule, subject to availability).',
      },
      {
        id: 'weather',
        label: 'Weather Cancellations',
        content: 'If we determine conditions are unsafe for travel (snow, ice, flooding, etc.), we will contact you to reschedule at no charge or provide a full refund. The decision to cancel for weather is at our sole discretion for safety reasons.',
      },
      {
        id: 'provider_cancellation',
        label: 'Cancellation by NW Touring',
        content: 'If we must cancel due to vehicle breakdown, driver illness, or circumstances beyond our control, you will receive a full refund or the option to reschedule at no charge.',
      },
      {
        id: 'no_show',
        label: 'No-Shows',
        content: 'If you do not show up for your scheduled tour and do not contact us, your reservation is considered a no-show and is non-refundable.',
      },
      {
        id: 'refund_processing',
        label: 'Refund Processing',
        content: 'Approved refunds are processed within 5-7 business days. Card refunds may take an additional 5-10 business days to appear on your statement.',
      },
    ],
  },
  {
    id: 'guest_responsibilities',
    number: '5',
    title: 'Guest Responsibilities',
    content: 'To ensure a safe and enjoyable experience for all guests, we require the following:',
    subsections: [
      {
        id: 'age',
        label: 'Age Requirements',
        content: 'All guests consuming alcohol must be at least 21 years of age. Valid ID may be required by wineries. Guests under 21 are welcome on tours but may not consume alcohol.',
      },
      {
        id: 'conduct',
        label: 'Conduct',
        content: 'Guests are expected to behave responsibly and respectfully toward our drivers, other guests, and winery staff. We reserve the right to refuse service or terminate a tour if guest behavior becomes unsafe, disruptive, or illegal. No refund will be provided for tours terminated due to guest conduct.',
      },
      {
        id: 'punctuality',
        label: 'Punctuality',
        content: 'Please be ready at your scheduled pickup time. We allow a 15-minute grace period. Extended wait times may impact your itinerary and result in missed reservations.',
      },
      {
        id: 'communication',
        label: 'Communication',
        content: 'Please provide a working cell phone number and respond promptly to messages regarding your tour. Failure to communicate may result in missed pickups or cancellations.',
      },
    ],
  },
];

// ============================================================================
// COMBINE ALL SECTIONS INTO COMPLETE TERMS
// ============================================================================

// Convert liability sections to the same format as booking sections
const liabilitySectionsAsTerms: TermsSection[] = NW_TOURING_LIABILITY_SECTIONS.map(section => ({
  id: section.id,
  number: section.number,
  title: section.title,
  content: section.content,
  subsections: section.subsections?.map(sub => ({
    id: sub.id,
    label: sub.label,
    content: sub.content,
  })),
}));

export const NW_TOURING_COMPLETE_TERMS: TermsSection[] = [
  ...NW_TOURING_BOOKING_SECTIONS,
  ...liabilitySectionsAsTerms,
  // Add contact section at the end
  {
    id: 'contact',
    number: '7',
    title: 'Contact Information',
    content: 'For questions, changes, or concerns regarding your booking:',
    subsections: [
      {
        id: 'email',
        label: 'Email',
        content: NW_TOURING_COMPANY_INFO.email || 'info@nwtouring.com',
      },
      {
        id: 'phone',
        label: 'Phone',
        content: NW_TOURING_COMPANY_INFO.phone || '509-200-8000',
      },
      {
        id: 'response',
        label: 'Response Time',
        content: 'We typically respond within 2 hours during business hours (9am-6pm Pacific).',
      },
    ],
  },
  {
    id: 'agreement',
    number: '8',
    title: 'Agreement and Acceptance',
    content: 'By making a reservation with NW Touring & Concierge, you acknowledge that you have read, understand, and agree to these Terms and Conditions. Your deposit payment or electronic acceptance constitutes your legal agreement to be bound by these terms. These terms apply to all guests in your party.',
  },
];

export const NW_TOURING_FULL_TERMS = {
  version: '1.0',
  lastUpdated: '2025-12-25',
  company: NW_TOURING_COMPANY_INFO,
  sections: NW_TOURING_COMPLETE_TERMS,
  vehicleDamageFees: VEHICLE_DAMAGE_FEES,
  cancellationPolicy: CANCELLATION_POLICY,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all terms sections formatted for display
 */
export function getNWTouringCompleteTermsText(): string {
  return NW_TOURING_COMPLETE_TERMS.map(section => {
    let text = `${section.number}. ${section.title}\n${section.content}`;
    if (section.subsections) {
      text += '\n' + section.subsections.map(sub => `  ${sub.label}: ${sub.content}`).join('\n');
    }
    return text;
  }).join('\n\n');
}

/**
 * Get a specific section by ID
 */
export function getNWTouringSection(sectionId: string): TermsSection | undefined {
  return NW_TOURING_COMPLETE_TERMS.find(s => s.id === sectionId);
}

/**
 * Get quick summary points for NW Touring terms
 */
export function getNWTouringTermsSummary(): string[] {
  return [
    'Deposit required to confirm reservation',
    'Final payment due 48 hours after tour concludes',
    'Wine tours billed at hourly rate based on actual duration',
    'Tasting fees, meals, and gratuity not included',
    'Full refund if cancelled 30+ days before',
    '50% refund if cancelled 15-29 days before',
    'No refund within 15 days (transfer/reschedule available)',
    'Weather cancellations receive full refund',
    'All alcohol consumers must be 21+',
    'Vehicle cleaning fee up to $300 for excessive messes',
    '$1,500,000 liability insurance (FMCSA compliant)',
    'Oregon law governs; disputes resolved in Umatilla County',
  ];
}

/**
 * Get deposit amount based on party size
 */
export function getDepositAmount(partySize: number): number {
  if (partySize <= 7) return 250;
  if (partySize <= 14) return 350;
  // For 15+, return a base amount (actual amount determined case-by-case)
  return 500;
}

/**
 * Check if booking qualifies for full refund
 */
export function qualifiesForFullRefund(tourDate: Date | string): boolean {
  // Parse as local time (new Date('YYYY-MM-DD') parses as UTC, causing timezone bugs)
  const tour = typeof tourDate === 'string'
    ? (() => { const [y, m, d] = tourDate.split('-').map(Number); return new Date(y, m - 1, d); })()
    : tourDate;
  const now = new Date();
  const diffTime = tour.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return daysUntil >= 30;
}
