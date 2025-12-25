/**
 * Pricing Models Type Definitions
 * Matches the three actual Walla Walla Travel pricing structures:
 * 1. Hourly Tours - tiered by guest count + day of week
 * 2. Fixed Rate Private Tours - negotiated flat rate
 * 3. Shared Group Tours - per-person ticketed
 */

// ============================================================================
// PRICING MODEL TYPES
// ============================================================================

export type PricingModel = 'hourly' | 'fixed' | 'per_person';
export type DayType = 'sun_wed' | 'thu_sat';
export type ServiceType = 'wine_tour' | 'shared_tour' | 'transfer' | 'wait_time' | 'fixed_private';

// ============================================================================
// HOURLY TOUR RATES
// ============================================================================

export interface HourlyRateTier {
  id: number;
  serviceType: ServiceType;
  tierName: string;
  guestMin: number;
  guestMax: number;
  dayType: DayType;
  hourlyRate: number;
  minimumHours: number;
  isActive: boolean;
}

export interface HourlyRateLookupResult {
  hourlyRate: number;
  tierName: string;
  dayType: DayType;
  minimumHours: number;
}

// The actual rate table from rate-config.ts
export const HOURLY_WINE_TOUR_RATES = {
  sun_wed: {
    '1-2': 85,
    '3-4': 95,
    '5-6': 105,
    '7-8': 115,
    '9-11': 130,
    '12-14': 140,
    minimumHours: 4, // 4 hour minimum Sun-Wed
  },
  thu_sat: {
    '1-2': 95,
    '3-4': 105,
    '5-6': 115,
    '7-8': 125,
    '9-11': 140,
    '12-14': 150,
    minimumHours: 5, // 5 hour minimum Thu-Sat
  },
} as const;

export const WAIT_TIME_RATES = {
  sun_wed: {
    '1-4': 75,
    '5-8': 95,
    '9-14': 110,
  },
  thu_sat: {
    '1-4': 85,
    '5-8': 105,
    '9-14': 120,
  },
  minimumHours: 1,
} as const;

// ============================================================================
// SHARED TOUR RATES
// ============================================================================

export interface SharedTourRate {
  id: number;
  name: string;
  description?: string;
  perPersonRate: number;
  includesLunch: boolean;
  availableDays: string[];
  maxGuests: number;
  minGuests: number;
  isActive: boolean;
}

export const SHARED_TOUR_RATES = {
  base: {
    name: 'Shared Wine Tour',
    perPersonRate: 95,
    includesLunch: false,
  },
  withLunch: {
    name: 'Shared Wine Tour with Lunch',
    perPersonRate: 115,
    includesLunch: true,
  },
  availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday'],
  maxGuests: 14,
} as const;

// ============================================================================
// TRANSFER RATES
// ============================================================================

export interface TransferRate {
  id: number;
  routeCode: string;
  routeName: string;
  origin: string;
  destination: string;
  fixedRate: number | null;
  perPersonRate: number;
  baseGuestsIncluded: number;
  isActive: boolean;
  notes?: string;
}

export const TRANSFER_RATES = {
  SEA_TO_WALLA: { name: 'SeaTac to Walla Walla', rate: 850 },
  WALLA_TO_SEA: { name: 'Walla Walla to SeaTac', rate: 850 },
  PSC_TO_WALLA: { name: 'Pasco to Walla Walla', rate: null }, // TBD
  WALLA_TO_PSC: { name: 'Walla Walla to Pasco', rate: null }, // TBD
  LOCAL: { name: 'Local Transfer', baseRate: 100, perMile: 3, baseMiles: 10 },
} as const;

// ============================================================================
// INVOICE LINE ITEM CATEGORIES
// ============================================================================

export type InvoiceLineItemCategory =
  | 'hourly_tour'      // Hourly wine tour
  | 'shared_tour_ticket' // Per-person shared tour ticket
  | 'fixed_private'    // Negotiated fixed rate
  | 'transfer'         // Airport/local transfer
  | 'wait_time'        // Wait time charges
  | 'add_on'           // Additional services
  | 'discount'         // Discounts
  | 'processing_fee'   // Credit card fee
  | 'tip'              // Gratuity
  | 'tax';             // Tax line item

// ============================================================================
// PRICE CALCULATION RESULTS
// ============================================================================

export interface HourlyTourPriceResult {
  pricingModel: 'hourly';
  hourlyRate: number;
  hours: number;
  billableHours: number;
  guestCount: number;
  tierName: string;
  dayType: DayType;
  subtotal: number;
  tax: number;
  total: number;
}

export interface SharedTourPriceResult {
  pricingModel: 'per_person';
  perPersonRate: number;
  ticketCount: number;
  includesLunch: boolean;
  subtotal: number;
  tax: number;
  total: number;
}

export interface FixedTourPriceResult {
  pricingModel: 'fixed';
  description: string;
  fixedAmount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface TransferPriceResult {
  pricingModel: 'fixed';
  routeCode: string;
  routeName: string;
  fixedRate: number;
  subtotal: number;
  tax: number;
  total: number;
}

export type PriceResult =
  | HourlyTourPriceResult
  | SharedTourPriceResult
  | FixedTourPriceResult
  | TransferPriceResult;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine day type from a date
 */
export function getDayType(date: Date | string): DayType {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getDay(); // 0=Sunday, 6=Saturday

  // Thursday(4), Friday(5), Saturday(6) = thu_sat
  if (dayOfWeek >= 4 && dayOfWeek <= 6) {
    return 'thu_sat';
  }
  return 'sun_wed';
}

/**
 * Get the rate tier name for a guest count
 */
export function getGuestTier(guestCount: number): string {
  if (guestCount <= 2) return '1-2';
  if (guestCount <= 4) return '3-4';
  if (guestCount <= 6) return '5-6';
  if (guestCount <= 8) return '7-8';
  if (guestCount <= 11) return '9-11';
  return '12-14';
}

/**
 * Get hourly rate for wine tour
 */
export function getHourlyTourRate(guestCount: number, date: Date | string): HourlyRateLookupResult {
  const dayType = getDayType(date);
  const tier = getGuestTier(guestCount);
  const rates = HOURLY_WINE_TOUR_RATES[dayType];
  const hourlyRate = rates[tier as keyof Omit<typeof rates, 'minimumHours'>] as number;

  return {
    hourlyRate,
    tierName: `${tier} guests`,
    dayType,
    minimumHours: rates.minimumHours, // 4 hours Sun-Wed, 5 hours Thu-Sat
  };
}

/**
 * Calculate hourly tour price
 */
export function calculateHourlyTourPrice(
  guestCount: number,
  hours: number,
  date: Date | string
): HourlyTourPriceResult {
  const rateInfo = getHourlyTourRate(guestCount, date);
  const billableHours = Math.max(hours, rateInfo.minimumHours);
  const subtotal = rateInfo.hourlyRate * billableHours;
  const taxRate = 0.089; // WA state tax
  const tax = subtotal * taxRate;

  return {
    pricingModel: 'hourly',
    hourlyRate: rateInfo.hourlyRate,
    hours,
    billableHours,
    guestCount,
    tierName: rateInfo.tierName,
    dayType: rateInfo.dayType,
    subtotal,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

/**
 * Calculate shared tour price
 */
export function calculateSharedTourPrice(
  ticketCount: number,
  includesLunch: boolean = true
): SharedTourPriceResult {
  const rate = includesLunch
    ? SHARED_TOUR_RATES.withLunch.perPersonRate
    : SHARED_TOUR_RATES.base.perPersonRate;

  const subtotal = rate * ticketCount;
  const taxRate = 0.089;
  const tax = subtotal * taxRate;

  return {
    pricingModel: 'per_person',
    perPersonRate: rate,
    ticketCount,
    includesLunch,
    subtotal,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

/**
 * Calculate fixed tour price
 */
export function calculateFixedTourPrice(
  description: string,
  fixedAmount: number
): FixedTourPriceResult {
  const taxRate = 0.089;
  const tax = fixedAmount * taxRate;

  return {
    pricingModel: 'fixed',
    description,
    fixedAmount,
    subtotal: fixedAmount,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((fixedAmount + tax) * 100) / 100,
  };
}

/**
 * Check if a date is valid for shared tours (Sun-Wed only)
 */
export function isSharedTourDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  return SHARED_TOUR_RATES.availableDays.includes(dayName);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format day type for display
 */
export function formatDayType(dayType: DayType): string {
  return dayType === 'thu_sat' ? 'Thu-Sat' : 'Sun-Wed';
}
