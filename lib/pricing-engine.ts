/**
 * Pricing Engine
 *
 * Calculates pricing using the ACTUAL hourly rate card from rate-config.ts.
 * Rates vary by party size tier and day of week (Sun-Wed vs Thu-Sat).
 *
 * Pricing model:
 *   hourly_rate × billable_hours = subtotal
 *   + tax (9.1%) = total
 *   deposit = 50% of total
 */

import {
  calculateWineTourPrice,
  getRates,
  getHourlyRate,
} from './rate-config';

interface PricingRequest {
  date: string;
  duration_hours: number;
  party_size: number;
  vehicle_type?: string;
}

interface PricingResult {
  base_price: number;
  duration_price: number;
  hourly_rate: number;
  billable_hours: number;
  day_type: 'Sun-Wed' | 'Thu-Sat';
  rate_tier: string;
  minimum_hours: number;
  weekend_surcharge: number;
  holiday_surcharge: number;
  large_group_discount: number;
  subtotal: number;
  estimated_gratuity: number;
  taxes: number;
  total: number;
  deposit_required: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

/**
 * Calculate price for a booking using actual hourly rate card
 */
export function calculatePrice(request: PricingRequest): PricingResult {
  const { date, duration_hours, party_size } = request;
  const rates = getRates();

  // Use the real rate card
  const tourPrice = calculateWineTourPrice(duration_hours, party_size, date);

  const subtotal = tourPrice.subtotal;
  const taxes = tourPrice.tax;
  const total = tourPrice.total;

  // Suggested gratuity (not included in total)
  const estimated_gratuity = subtotal * 0.15;

  // 50% deposit
  const deposit_required = total * rates.deposit_percentage;

  // Build breakdown
  const breakdown: { label: string; amount: number }[] = [];

  // Show hourly rate × hours
  const hoursLabel = tourPrice.hours > duration_hours
    ? `${duration_hours}hr requested, ${tourPrice.hours}hr minimum`
    : `${tourPrice.hours} hours`;

  breakdown.push({
    label: `Wine Tour — ${tourPrice.rate_tier}, ${tourPrice.day_type} ($${tourPrice.hourly_rate}/hr × ${hoursLabel})`,
    amount: subtotal,
  });

  breakdown.push({
    label: 'Subtotal',
    amount: subtotal,
  });

  breakdown.push({
    label: 'WA State Tax (9.1%)',
    amount: taxes,
  });

  breakdown.push({
    label: 'Total',
    amount: total,
  });

  breakdown.push({
    label: 'Suggested Gratuity (15%)',
    amount: estimated_gratuity,
  });

  breakdown.push({
    label: 'Deposit Required (50%)',
    amount: deposit_required,
  });

  return {
    base_price: subtotal,
    duration_price: subtotal,
    hourly_rate: tourPrice.hourly_rate,
    billable_hours: tourPrice.hours,
    day_type: tourPrice.day_type,
    rate_tier: tourPrice.rate_tier,
    minimum_hours: tourPrice.minimum_hours,
    // These legacy fields are 0 — day-of-week pricing is built into hourly rates
    weekend_surcharge: 0,
    holiday_surcharge: 0,
    large_group_discount: 0,
    subtotal,
    estimated_gratuity,
    taxes,
    total,
    deposit_required,
    breakdown,
  };
}

/**
 * Get price estimate for display
 */
export function getPriceEstimate(duration_hours: number, party_size: number): string {
  // Use midweek rate as the starting-from estimate
  const hourlyRate = getHourlyRate(party_size, new Date('2026-01-05')); // A Monday
  const rates = getRates();
  const minHours = rates.wine_tours.sun_wed_minimum_hours;
  const hours = Math.max(duration_hours, minHours);
  return `$${(hourlyRate * hours).toFixed(0)}`;
}

/**
 * Validate pricing request
 */
export function validatePricingRequest(request: PricingRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (request.duration_hours < 1 || request.duration_hours > 12) {
    errors.push('Duration must be between 1 and 12 hours');
  }

  if (request.party_size < 1 || request.party_size > 14) {
    errors.push('Party size must be between 1 and 14');
  }

  const tourDate = new Date(request.date);
  if (isNaN(tourDate.getTime())) {
    errors.push('Invalid date format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculate final payment amount
 */
export function calculateFinalPayment(total: number, deposit_paid: number): number {
  return Math.max(0, total - deposit_paid);
}
