/**
 * Walla Walla Travel - Terms of Service
 *
 * These terms apply to the booking platform and non-transportation services.
 * Transportation-specific terms are handled by NW Touring & Concierge.
 */

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

export const WWT_COMPANY_INFO = {
  legalName: 'Walla Walla Travel LLC',
  displayName: 'Walla Walla Travel',
  stateOfFormation: 'OR',
  email: 'info@wallawalla.travel',
  phone: '509-200-8000',
  website: 'https://wallawalla.travel',
  address: {
    city: 'Walla Walla',
    state: 'WA',
  },
};

export const WWT_TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'booking_reservations',
    number: '1',
    title: 'Booking and Reservations',
    content: 'Walla Walla Travel facilitates bookings for various travel services including wine tours, transportation, and trip planning.',
    subsections: [
      {
        id: 'deposit',
        label: 'Deposit',
        content: 'A deposit is required to secure your reservation. Deposit amounts vary based on party size: 1-7 guests: $250 deposit; 8-14 guests: $350 deposit; 15+ guests: Custom deposit amount (contact us).',
      },
      {
        id: 'final_payment',
        label: 'Final Payment',
        content: 'Final payment is due within 48 hours after your tour concludes. This allows us to accurately bill for actual service time, lunch costs, and any additional services provided during your experience.',
      },
      {
        id: 'confirmation',
        label: 'Itinerary Confirmation',
        content: 'After your deposit is received, we will contact you to finalize your itinerary. Tours are not considered confirmed until you receive written confirmation from Walla Walla Travel.',
      },
    ],
  },
  {
    id: 'services_provided',
    number: '2',
    title: 'Services Provided',
    content: 'Walla Walla Travel coordinates travel experiences in the Walla Walla Valley region.',
    subsections: [
      {
        id: 'transportation',
        label: 'Transportation',
        content: 'Transportation services are provided by NW Touring & Concierge LLC (USDOT 3603851), a licensed motor carrier. Transportation is subject to separate Transportation Terms and Conditions.',
      },
      {
        id: 'customization',
        label: 'Customization',
        content: 'We work with you to create a personalized experience, including winery selections, lunch reservations, and timing preferences.',
      },
      {
        id: 'not_included',
        label: 'What\'s Not Included',
        content: 'Unless otherwise stated, services do not include: Wine tasting fees at wineries, meals and beverages, gratuities for your driver (appreciated but not required), or personal expenses.',
      },
    ],
  },
  {
    id: 'cancellation',
    number: '3',
    title: 'Cancellation Policy',
    content: 'For detailed cancellation terms, please see our Cancellation Policy. Summary: Full refund 30+ days before, 50% refund 15-29 days before, no refund within 15 days (transfer/reschedule available).',
  },
  {
    id: 'modifications',
    number: '4',
    title: 'Changes and Modifications',
    content: '',
    subsections: [
      {
        id: 'by_customer',
        label: 'By Customer',
        content: 'We understand plans change! You may request changes to your itinerary up to 48 hours before your scheduled tour. Changes made within 48 hours are subject to availability.',
      },
      {
        id: 'by_wwt',
        label: 'By Walla Walla Travel',
        content: 'We reserve the right to make changes to your itinerary due to circumstances beyond our control (e.g., winery closures, weather, vehicle issues). We will notify you immediately and work to provide comparable alternatives.',
      },
    ],
  },
  {
    id: 'guest_conduct',
    number: '5',
    title: 'Guest Conduct',
    content: '',
    subsections: [
      {
        id: 'alcohol',
        label: 'Alcohol Consumption',
        content: 'All guests must be 21+ years old to participate in wine tasting. We promote responsible drinking and reserve the right to refuse service to intoxicated guests.',
      },
      {
        id: 'vehicle_care',
        label: 'Vehicle Care',
        content: 'Guests are responsible for any damage to the vehicle caused by their party. Additional cleaning fees may apply for excessive mess (up to $300 for specialized cleaning services if needed).',
      },
      {
        id: 'punctuality',
        label: 'Punctuality',
        content: 'Please be ready at your scheduled pickup time. Extended wait times may impact your itinerary.',
      },
    ],
  },
  {
    id: 'liability',
    number: '6',
    title: 'Liability',
    content: 'For transportation services, liability terms are governed by NW Touring & Concierge Transportation Terms.',
    subsections: [
      {
        id: 'personal_belongings',
        label: 'Personal Belongings',
        content: 'We are not responsible for lost, stolen, or damaged personal items. Please keep valuables secure.',
      },
      {
        id: 'third_party',
        label: 'Third-Party Services',
        content: 'Wineries, restaurants, and other venues are independent businesses. We are not liable for their services, policies, or operations.',
      },
    ],
  },
  {
    id: 'weather',
    number: '7',
    title: 'Weather and Delays',
    content: 'Tours operate in most weather conditions. In cases of severe weather or unsafe driving conditions, we may need to reschedule your tour at no additional charge.',
  },
  {
    id: 'privacy',
    number: '8',
    title: 'Privacy',
    content: 'We collect and store personal information (name, email, phone) to provide our services. We do not sell or share your information with third parties except as necessary to fulfill your booking (e.g., winery reservations, transportation provider).',
  },
  {
    id: 'disputes',
    number: '9',
    title: 'Disputes and Resolution',
    content: 'If you have any concerns during or after your tour, please contact us immediately at info@wallawalla.travel or 509-200-8000. We are committed to making things right. These terms are governed by the laws of the State of Oregon. Any disputes will be resolved in the courts of Umatilla County, Oregon.',
  },
  {
    id: 'changes_to_terms',
    number: '10',
    title: 'Changes to These Terms',
    content: 'We may update these terms from time to time. The "Last updated" date at the top indicates when the most recent changes were made. Continued use of our services after changes constitutes acceptance of the updated terms.',
  },
  {
    id: 'service_providers',
    number: '11',
    title: 'Service Providers',
    content: 'Walla Walla Travel coordinates with various service providers to deliver your travel experience.',
    subsections: [
      {
        id: 'transportation_provider',
        label: 'Transportation',
        content: 'Wine tours, airport transfers, and charter services are provided by NW Touring & Concierge LLC (USDOT: 3603851, MC: 1225087), an Oregon limited liability company operating as a licensed passenger motor carrier. Transportation services are subject to NW Touring & Concierge Transportation Terms and Conditions.',
      },
      {
        id: 'planning_services',
        label: 'Planning Services',
        content: 'Trip planning, itinerary creation, and concierge services are provided directly by Walla Walla Travel LLC.',
      },
    ],
  },
];

export const WWT_TERMS = {
  version: '1.0',
  lastUpdated: '2025-12-25',
  company: WWT_COMPANY_INFO,
  sections: WWT_TERMS_SECTIONS,
};

/**
 * Get a specific terms section by ID
 */
export function getTermsSection(sectionId: string): TermsSection | undefined {
  return WWT_TERMS_SECTIONS.find(s => s.id === sectionId);
}

/**
 * Get all terms sections as formatted text
 */
export function getTermsSectionsText(): string {
  return WWT_TERMS_SECTIONS.map(section => {
    let text = `${section.number}. ${section.title}\n${section.content}`;
    if (section.subsections) {
      text += '\n' + section.subsections.map(sub => `  ${sub.label}: ${sub.content}`).join('\n');
    }
    return text;
  }).join('\n\n');
}

/**
 * Get key terms summary for quick display
 */
export function getKeyTermsSummary(): string[] {
  return [
    'Deposit required to confirm booking',
    'Final payment due 48 hours after tour concludes',
    'Transportation provided by NW Touring & Concierge LLC (USDOT 3603851)',
    'Tasting fees and meals not included in tour price',
    'All guests must be 21+ for wine tasting',
    'Changes to itinerary available up to 48 hours before tour',
    'See Cancellation Policy for refund terms',
  ];
}
