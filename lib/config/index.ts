/**
 * Centralized Configuration Management
 * Single entry point for all application configuration
 */

// Environment configuration (validated at startup)
export { env } from './env';

// Rate/Pricing configuration
export {
  type RateConfig,
  defaultRates,
  getRates,
  formatCurrency,
  getHourlyRate,
  calculateWineTourPrice,
  calculateSharedTourPrice,
  calculateTransferPrice,
  calculateWaitTimePrice,
  calculateTax,
  calculateDeposit,
  getDayOfWeek,
  isSharedTourDay,
} from '../rate-config';

// Theme configuration
export {
  theme,
  themeClasses,
} from '../theme-config';

// HOS (Hours of Service) configuration
export {
  HOS_LIMITS,
  calculateAirMiles,
  qualifiesFor150AirMileExemption,
  calculateAvailableHours,
  validateHOSCompliance,
  WALLA_WALLA_BASE,
} from '../hos-config';

/**
 * Application Constants
 * Core constants used throughout the application
 */
export const APP_CONFIG = {
  // Application Info
  name: 'Walla Walla Travel',
  version: '1.0.0',
  
  // API Configuration
  api: {
    version: 'v1',
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
    timeout: 30000, // 30 seconds
  },
  
  // Pagination
  pagination: {
    defaultLimit: 50,
    maxLimit: 100,
  },
  
  // Date/Time
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  timezone: 'America/Los_Angeles', // Pacific Time
  
  // Business Hours
  businessHours: {
    start: '08:00',
    end: '20:00',
  },
  
  // Contact Info
  contact: {
    email: 'info@wallawalla.travel',
    phone: '+1 (509) 200-8000',
    phoneDisplay: '(509) 200-8000',
  },
  
  // Booking Configuration
  booking: {
    minAdvanceBookingDays: 2,       // Minimum 2 days advance
    maxAdvanceBookingDays: 365,     // Maximum 1 year advance
    consultationDeadlineHours: 24,  // 24 hours for consultation
    finalPaymentHoursAfterTour: 48, // Pay 48 hours after tour
  },
  
  // Payment Configuration
  payment: {
    acceptedMethods: ['card', 'check'],
    cardProcessingFee: {
      percentage: 2.9,
      flatFee: 0,
    },
    depositRules: {
      smallGroup: { min: 1, max: 7, deposit: 250 },
      largeGroup: { min: 8, max: 14, deposit: 350 },
    },
  },
  
  // Tour Configuration
  tour: {
    minPartySize: 1,
    maxPartySize: 14,
    typicalDuration: 6, // hours
    minWineries: 1,
    maxWineries: 6,
    typicalWineries: 3,
  },
  
  // Pricing Display Thresholds (from system_settings)
  pricingDisplay: {
    consultationRequired: { min: 1, max: 3 },    // "Let's Talk"
    standardPricing: { min: 4, max: 5 },         // Show actual rates
    perPersonRanges: { min: 6, max: 14 },        // Show per-person
  },
  
  // Cache Durations (seconds)
  cache: {
    short: 60,        // 1 minute
    medium: 300,      // 5 minutes
    long: 1800,       // 30 minutes
    veryLong: 3600,   // 1 hour
    day: 86400,       // 24 hours
  },
  
  // Rate Limiting
  rateLimit: {
    public: 100,           // requests per minute
    authenticated: 1000,   // requests per minute
  },
  
  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedDocumentTypes: ['application/pdf'],
  },
  
  // SEO
  seo: {
    defaultTitle: 'Walla Walla Travel - Wine Tours & Transportation',
    defaultDescription: 'Premium wine tours and transportation services in Walla Walla Valley',
    keywords: ['wine tours', 'walla walla', 'transportation', 'wine country'],
  },
  
  // Features Flags (for gradual rollout)
  features: {
    voiceInspections: true,
    aiDirectory: true,
    businessPortal: true,
    multiModel: false, // Not yet implemented
  },
} as const;

/**
 * Brand Configuration
 * Multi-brand portfolio setup
 */
export const BRANDS = {
  WWT: {
    id: 1,
    code: 'WWT',
    name: 'Walla Walla Travel',
    displayName: 'Walla Walla Travel',
    website: 'https://wallawalla.travel',
    email: 'info@wallawalla.travel',
    phone: '+1 (509) 200-8000',
    description: 'Your gateway to Walla Walla wine country',
  },
  NWT: {
    id: 2,
    code: 'NWT',
    name: 'NW Touring & Concierge',
    displayName: 'NW Touring & Concierge',
    website: 'https://nwtouring.com',
    email: 'info@nwtouring.com',
    phone: '+1 (509) 200-8000',
    description: 'Premium touring and concierge services',
  },
  HCWT: {
    id: 3,
    code: 'HCWT',
    name: 'Herding Cats Wine Tours',
    displayName: 'Herding Cats Wine Tours',
    website: 'https://herdingcatswine.com',
    email: 'info@herdingcatswine.com',
    phone: '+1 (509) 200-8000',
    description: 'Sophisticated wine tours with wit and pretension',
  },
} as const;

/**
 * Helper Functions
 */

/**
 * Get configuration value with type safety
 */
export function getConfig<T extends keyof typeof APP_CONFIG>(key: T): typeof APP_CONFIG[T] {
  return APP_CONFIG[key];
}

/**
 * Get brand by code
 */
export function getBrand(code: 'WWT' | 'NWT' | 'HCWT') {
  return BRANDS[code];
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof APP_CONFIG.features): boolean {
  return APP_CONFIG.features[feature];
}

/**
 * Get full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${APP_CONFIG.api.baseUrl}${endpoint}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
}

/**
 * Get deposit amount based on party size
 */
export function getDepositAmount(partySize: number): number {
  const rules = APP_CONFIG.payment.depositRules;
  
  if (partySize >= rules.largeGroup.min && partySize <= rules.largeGroup.max) {
    return rules.largeGroup.deposit;
  }
  
  if (partySize >= rules.smallGroup.min && partySize <= rules.smallGroup.max) {
    return rules.smallGroup.deposit;
  }
  
  // Default fallback (for groups > 14)
  return 350;
}

/**
 * Calculate card processing fee
 */
export function calculateCardFee(amount: number): number {
  const { percentage, flatFee } = APP_CONFIG.payment.cardProcessingFee;
  return (amount * (percentage / 100)) + flatFee;
}

/**
 * Get pricing display mode for party size
 */
export function getPricingDisplayMode(partySize: number): 'consultation' | 'standard' | 'per-person' {
  const { consultationRequired, standardPricing, perPersonRanges } = APP_CONFIG.pricingDisplay;
  
  if (partySize >= consultationRequired.min && partySize <= consultationRequired.max) {
    return 'consultation';
  }
  
  if (partySize >= standardPricing.min && partySize <= standardPricing.max) {
    return 'standard';
  }
  
  if (partySize >= perPersonRanges.min && partySize <= perPersonRanges.max) {
    return 'per-person';
  }
  
  return 'consultation'; // Default fallback
}

/**
 * Validate party size
 */
export function isValidPartySize(partySize: number): boolean {
  return partySize >= APP_CONFIG.tour.minPartySize && partySize <= APP_CONFIG.tour.maxPartySize;
}

/**
 * Validate booking date (within acceptable range)
 */
export function isValidBookingDate(date: Date | string): boolean {
  const bookingDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + APP_CONFIG.booking.minAdvanceBookingDays);
  
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + APP_CONFIG.booking.maxAdvanceBookingDays);
  
  return bookingDate >= minDate && bookingDate <= maxDate;
}


