/**
 * Pricing Engine
 * Calculates dynamic pricing based on:
 * - Duration (5 or 6 hours)
 * - Party size
 * - Day of week (weekend premium)
 * - Season/holidays
 * - Vehicle type
 */

interface PricingRequest {
  date: string;
  duration_hours: number;
  party_size: number;
  vehicle_type?: string;
}

interface PricingResult {
  base_price: number;
  duration_price: number;
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

// Base pricing configuration
const PRICING_CONFIG = {
  // Base rates by duration (for base party size of 1-4)
  duration_rates: {
    5: 750,   // 5-hour tour (2 wineries + lunch): $750
    6: 900,   // 6-hour tour (3 wineries): $900
  } as Record<number, number>,

  // Per-person pricing (for guests beyond base 4)
  per_person_rate: 50,  // $50 per additional person beyond 4
  base_party_size: 4,   // Base price includes up to 4 people

  // Vehicle type multipliers
  vehicle_multipliers: {
    sprinter: 1.0,   // Standard rate for sprinter van (only vehicle type)
  } as Record<string, number>,

  // Surcharges
  weekend_surcharge_rate: 0.15,  // 15% weekend surcharge (Fri-Sun)
  holiday_surcharge_rate: 0.25,  // 25% holiday surcharge

  // Discounts
  large_group_discount_threshold: 10,  // 10+ people
  large_group_discount_rate: 0.10,     // 10% discount

  // Additional costs
  gratuity_rate: 0.15,  // Suggested 15% gratuity
  tax_rate: 0.089,      // 8.9% WA state tax

  // Deposit
  deposit_percentage: 0.50  // 50% deposit required
};

// Holiday dates (simplified - in production, use a database)
const HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-07-04', // Independence Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

/**
 * Calculate price for a booking
 */
export function calculatePrice(request: PricingRequest): PricingResult {
  const { date, duration_hours, party_size, vehicle_type = 'sprinter' } = request;

  // 1. Get base price for duration
  const baseDurationPrice = PRICING_CONFIG.duration_rates[duration_hours as 5 | 6] || 900;

  // 2. Calculate per-person charge (for guests beyond base 4)
  const additionalGuests = Math.max(0, party_size - PRICING_CONFIG.base_party_size);
  const perPersonCharge = additionalGuests * PRICING_CONFIG.per_person_rate;

  // 3. Apply vehicle type multiplier
  const vehicleMultiplier = PRICING_CONFIG.vehicle_multipliers[vehicle_type as keyof typeof PRICING_CONFIG.vehicle_multipliers] || 1.0;
  const base_price = (baseDurationPrice + perPersonCharge) * vehicleMultiplier;

  // 3. Check if weekend
  const tourDate = new Date(date);
  const dayOfWeek = tourDate.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
  const weekend_surcharge = isWeekend ? base_price * PRICING_CONFIG.weekend_surcharge_rate : 0;

  // 4. Check if holiday
  const isHoliday = HOLIDAYS_2025.includes(date);
  const holiday_surcharge = isHoliday ? base_price * PRICING_CONFIG.holiday_surcharge_rate : 0;

  // 5. Apply large group discount
  const qualifiesForDiscount = party_size >= PRICING_CONFIG.large_group_discount_threshold;
  const large_group_discount = qualifiesForDiscount 
    ? (base_price + weekend_surcharge + holiday_surcharge) * PRICING_CONFIG.large_group_discount_rate 
    : 0;

  // 6. Calculate subtotal
  const subtotal = base_price + weekend_surcharge + holiday_surcharge - large_group_discount;

  // 7. Calculate gratuity (suggested, not required)
  const estimated_gratuity = subtotal * PRICING_CONFIG.gratuity_rate;

  // 8. Calculate taxes (on subtotal only, not gratuity)
  const taxes = subtotal * PRICING_CONFIG.tax_rate;

  // 9. Calculate total
  const total = subtotal + taxes;

  // 10. Calculate deposit
  const deposit_required = total * PRICING_CONFIG.deposit_percentage;

  // 11. Build breakdown
  const breakdown = [
    {
      label: `${duration_hours}-Hour Tour (base ${PRICING_CONFIG.base_party_size} guests)`,
      amount: baseDurationPrice * vehicleMultiplier
    }
  ];

  if (perPersonCharge > 0) {
    breakdown.push({
      label: `Additional Guests (${additionalGuests} × $${PRICING_CONFIG.per_person_rate})`,
      amount: perPersonCharge * vehicleMultiplier
    });
  }

  if (weekend_surcharge > 0) {
    breakdown.push({
      label: 'Weekend Surcharge (15%)',
      amount: weekend_surcharge
    });
  }

  if (holiday_surcharge > 0) {
    breakdown.push({
      label: 'Holiday Surcharge (25%)',
      amount: holiday_surcharge
    });
  }

  if (large_group_discount > 0) {
    breakdown.push({
      label: `Large Group Discount (${party_size} guests, 10%)`,
      amount: -large_group_discount
    });
  }

  breakdown.push({
    label: 'Subtotal',
    amount: subtotal
  });

  breakdown.push({
    label: 'WA State Tax (8.9%)',
    amount: taxes
  });

  breakdown.push({
    label: 'Total',
    amount: total
  });

  breakdown.push({
    label: 'Suggested Gratuity (15%)',
    amount: estimated_gratuity
  });

  breakdown.push({
    label: 'Deposit Required (50%)',
    amount: deposit_required
  });

  return {
    base_price,
    duration_price: baseDurationPrice,
    weekend_surcharge,
    holiday_surcharge,
    large_group_discount,
    subtotal,
    estimated_gratuity,
    taxes,
    total,
    deposit_required,
    breakdown
  };
}

/**
 * Get price estimate for display
 */
export function getPriceEstimate(duration_hours: number, party_size: number): string {
  const basePrice = PRICING_CONFIG.duration_rates[duration_hours as 5 | 6] || 900;
  const multiplier = PRICING_CONFIG.vehicle_multipliers['sprinter'];
  const estimatedPrice = basePrice * multiplier;

  return `$${estimatedPrice.toFixed(0)}`;
}

/**
 * Validate pricing request
 */
export function validatePricingRequest(request: PricingRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check duration
  if (![5, 6].includes(request.duration_hours)) {
    errors.push('Duration must be 5 or 6 hours');
  }

  // Check party size
  if (request.party_size < 1 || request.party_size > 14) {
    errors.push('Party size must be between 1 and 14');
  }

  // Check date
  const tourDate = new Date(request.date);
  if (isNaN(tourDate.getTime())) {
    errors.push('Invalid date format');
  }

  return {
    valid: errors.length === 0,
    errors
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

