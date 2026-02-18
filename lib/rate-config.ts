/**
 * Rate Configuration
 * Centralized pricing for all services
 * 
 * ACTUAL WALLA WALLA TRAVEL RATES
 */

export interface RateConfig {
  // Wine Tours (Hourly-Based by Party Size)
  wine_tours: {
    // Sunday-Wednesday rates (per hour)
    sun_wed_rates: {
      '1-2': number;   // 1-2 guests
      '3-4': number;   // 3-4 guests
      '5-6': number;   // 5-6 guests
      '7-8': number;   // 7-8 guests
      '9-11': number;  // 9-11 guests
      '12-14': number; // 12-14 guests
    };
    sun_wed_minimum_hours: number;  // 4 hour minimum Sun-Wed
    // Thursday-Saturday rates (per hour)
    thu_sat_rates: {
      '1-2': number;   // 1-2 guests
      '3-4': number;   // 3-4 guests
      '5-6': number;   // 5-6 guests
      '7-8': number;   // 7-8 guests
      '9-11': number;  // 9-11 guests
      '12-14': number; // 12-14 guests
    };
    thu_sat_minimum_hours: number;  // 5 hour minimum Thu-Sat
    minimum_hours: number;  // Default minimum
  };
  
  // Shared Group Tours (New Program)
  shared_tours: {
    base_rate: number;        // $95 per person
    with_lunch_rate: number;  // $115 per person
    days: string[];           // Sun-Wed only
    max_guests: number;       // 14 guests
  };
  
  // Transfers
  transfers: {
    airport: {
      seatac_to_walla: number;  // $850
      walla_to_seatac: number;  // $850
      pasco_to_walla: number;   // TBD
      walla_to_pasco: number;   // TBD
      pendleton_to_walla: number; // TBD
      walla_to_pendleton: number; // TBD
      lagrande_to_walla: number;  // TBD
      walla_to_lagrande: number;  // TBD
    };
    local: {
      base_rate: number;        // Base local transfer
      per_mile: number;         // Per mile beyond base
      base_miles: number;       // Miles included in base
    };
  };
  
  // Wait Time (Scales with party size like wine tours)
  wait_time: {
    weekday_rates: {
      '1-4': number;   // Small groups: $75/hr
      '5-8': number;   // Medium groups: $95/hr
      '9-14': number;  // Large groups: $110/hr
    };
    weekend_rates: {
      '1-4': number;   // Small groups: $85/hr
      '5-8': number;   // Medium groups: $105/hr
      '9-14': number;  // Large groups: $120/hr
    };
    minimum_hours: number;      // Minimum 1 hour
  };
  
  // Additional Services
  additional_services: {
    lunch_coordination: number;  // Integrated (no charge)
    catered_lunch: number;       // TBD per person
    catered_dinner: number;      // TBD per person
    photography: number;         // TBD
    custom_itinerary: number;    // TBD
  };
  
  // Tax
  tax_rate: number;             // 9.1% WA state + local tax
  
  // Deposit
  deposit_percentage: number;   // 50% deposit (default)
}

// ACTUAL RATES - Based on Ryan's pricing structure
export const defaultRates: RateConfig = {
  wine_tours: {
    // Sunday-Wednesday rates (per hour) - 4 hour minimum
    sun_wed_rates: {
      '1-2': 85,    // $85/hour (often quoted as flat tour price)
      '3-4': 95,    // $95/hour
      '5-6': 105,   // $105/hour
      '7-8': 115,   // $115/hour
      '9-11': 130,  // $130/hour
      '12-14': 140, // $140/hour
    },
    sun_wed_minimum_hours: 4,  // 4 hour minimum Sun-Wed
    // Thursday-Saturday rates (per hour) - 5 hour minimum
    thu_sat_rates: {
      '1-2': 95,    // $95/hour (often quoted as flat tour price)
      '3-4': 105,   // $105/hour
      '5-6': 115,   // $115/hour
      '7-8': 125,   // $125/hour
      '9-11': 140,  // $140/hour
      '12-14': 150, // $150/hour
    },
    thu_sat_minimum_hours: 5,  // 5 hour minimum Thu-Sat
    minimum_hours: 4,  // Default minimum (used when day type unknown)
  },
  
  shared_tours: {
    base_rate: 95,        // $95 per person
    with_lunch_rate: 115, // $115 per person (encouraged)
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday'],
    max_guests: 14,       // 14 guests max
  },
  
  transfers: {
    airport: {
      seatac_to_walla: 850,   // $850
      walla_to_seatac: 850,   // $850
      pasco_to_walla: 0,      // TBD
      walla_to_pasco: 0,      // TBD
      pendleton_to_walla: 0,  // TBD
      walla_to_pendleton: 0,  // TBD
      lagrande_to_walla: 0,   // TBD
      walla_to_lagrande: 0,   // TBD
    },
    local: {
      base_rate: 100,         // $100 base
      per_mile: 3,            // $3 per mile
      base_miles: 10,         // 10 miles included
    },
  },
  
  wait_time: {
    weekday_rates: {
      '1-4': 75,   // Small groups: $75/hr
      '5-8': 95,   // Medium groups: $95/hr
      '9-14': 110, // Large groups: $110/hr
    },
    weekend_rates: {
      '1-4': 85,   // Small groups: $85/hr (weekend)
      '5-8': 105,  // Medium groups: $105/hr (weekend)
      '9-14': 120, // Large groups: $120/hr (weekend)
    },
    minimum_hours: 1,         // Minimum 1 hour
  },
  
  additional_services: {
    lunch_coordination: 0,    // Integrated into tour (no charge)
    catered_lunch: 0,         // TBD per person
    catered_dinner: 0,        // TBD per person
    photography: 0,           // TBD
    custom_itinerary: 0,      // TBD
  },
  
  tax_rate: 0.091,            // 9.1% WA state + local tax (Walla Walla)
  deposit_percentage: 0.50,   // 50% deposit (default, can be overridden)
};

// Helper to get current rates
export function getRates(): RateConfig {
  return defaultRates;
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return `$${Number(amount).toFixed(2)}`;
}

/**
 * Get hourly rate based on party size and day of week
 */
export function getHourlyRate(partySize: number, date: Date | string): number {
  const rates = getRates();
  const tourDate = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = tourDate.getDay(); // 0=Sunday, 6=Saturday
  
  // Determine if Thu-Sat (4=Thu, 5=Fri, 6=Sat)
  const isThursdayToSaturday = dayOfWeek >= 4 && dayOfWeek <= 6;
  
  // Select rate tier based on party size
  const rateTable = isThursdayToSaturday 
    ? rates.wine_tours.thu_sat_rates 
    : rates.wine_tours.sun_wed_rates;
  
  if (partySize <= 2) return rateTable['1-2'];
  if (partySize <= 4) return rateTable['3-4'];
  if (partySize <= 6) return rateTable['5-6'];
  if (partySize <= 8) return rateTable['7-8'];
  if (partySize <= 11) return rateTable['9-11'];
  return rateTable['12-14'];
}

/**
 * Calculate wine tour price based on ACTUAL pricing structure
 */
export function calculateWineTourPrice(
  duration: number,  // Hours
  partySize: number,
  date: Date | string
): {
  hourly_rate: number;
  hours: number;
  subtotal: number;
  tax: number;
  total: number;
  day_type: 'Sun-Wed' | 'Thu-Sat';
  rate_tier: string;
  minimum_hours: number;
} {
  const rates = getRates();
  const tourDate = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = tourDate.getDay();

  // Determine if Thu-Sat (4=Thu, 5=Fri, 6=Sat)
  const isThursdayToSaturday = dayOfWeek >= 4 && dayOfWeek <= 6;

  // Get the correct minimum hours based on day type
  const minimumHours = isThursdayToSaturday
    ? rates.wine_tours.thu_sat_minimum_hours
    : rates.wine_tours.sun_wed_minimum_hours;

  // Enforce minimum hours
  const billableHours = Math.max(duration, minimumHours);
  
  // Get hourly rate
  const hourly_rate = getHourlyRate(partySize, tourDate);
  
  // Calculate subtotal
  const subtotal = hourly_rate * billableHours;
  
  // Calculate tax
  const tax = subtotal * rates.tax_rate;
  
  // Total
  const total = subtotal + tax;

  // Determine day type (uses isThursdayToSaturday from above)
  const day_type = isThursdayToSaturday ? 'Thu-Sat' : 'Sun-Wed';
  
  // Determine rate tier
  let rate_tier = '';
  if (partySize <= 2) rate_tier = '1-2 guests';
  else if (partySize <= 4) rate_tier = '3-4 guests';
  else if (partySize <= 6) rate_tier = '5-6 guests';
  else if (partySize <= 8) rate_tier = '7-8 guests';
  else if (partySize <= 11) rate_tier = '9-11 guests';
  else rate_tier = '12-14 guests';
  
  return {
    hourly_rate,
    hours: billableHours,
    subtotal,
    tax,
    total,
    day_type,
    rate_tier,
    minimum_hours: minimumHours,
  };
}

/**
 * Calculate shared group tour price
 */
export function calculateSharedTourPrice(
  guests: number,
  includeLunch: boolean = true
): {
  per_person_rate: number;
  guests: number;
  subtotal: number;
  tax: number;
  total: number;
} {
  const rates = getRates();
  const per_person_rate = includeLunch 
    ? rates.shared_tours.with_lunch_rate 
    : rates.shared_tours.base_rate;
  
  const subtotal = per_person_rate * guests;
  const tax = subtotal * rates.tax_rate;
  const total = subtotal + tax;
  
  return {
    per_person_rate,
    guests,
    subtotal,
    tax,
    total,
  };
}

/**
 * Calculate transfer price
 */
export function calculateTransferPrice(
  type: 'seatac_to_walla' | 'walla_to_seatac' | 'pasco_to_walla' | 'walla_to_pasco' | 
        'pendleton_to_walla' | 'walla_to_pendleton' | 'lagrande_to_walla' | 'walla_to_lagrande' | 'local',
  miles?: number
): number {
  const rates = getRates();
  
  if (type === 'local' && miles) {
    const extraMiles = Math.max(0, miles - rates.transfers.local.base_miles);
    return rates.transfers.local.base_rate + (extraMiles * rates.transfers.local.per_mile);
  }
  
  return rates.transfers.airport[type as keyof typeof rates.transfers.airport] || 0;
}

/**
 * Calculate wait time price
 */
export function calculateWaitTimePrice(hours: number, partySize: number = 4, date: Date | string = new Date()): number {
  const rates = getRates();
  const billableHours = Math.max(hours, rates.wait_time.minimum_hours);
  
  // Determine if Thu-Sat
  const tourDate = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = tourDate.getDay();
  const isThuSat = dayOfWeek >= 4 && dayOfWeek <= 6;
  
  // Get rate based on party size and day type
  const ratesByDay = isThuSat ? rates.wait_time.weekend_rates : rates.wait_time.weekday_rates;
  
  let hourlyRate = ratesByDay['1-4']; // Default
  if (partySize >= 9) {
    hourlyRate = ratesByDay['9-14'];
  } else if (partySize >= 5) {
    hourlyRate = ratesByDay['5-8'];
  }
  
  return billableHours * hourlyRate;
}

/**
 * Calculate tax
 */
export function calculateTax(amount: number): number {
  const rates = getRates();
  return amount * rates.tax_rate;
}

/**
 * Calculate deposit
 */
export function calculateDeposit(total: number, customPercentage?: number): number {
  const rates = getRates();
  const percentage = customPercentage ?? rates.deposit_percentage;
  return total * percentage;
}

/**
 * Get day of week name
 */
export function getDayOfWeek(date: Date | string): string {
  const tourDate = typeof date === 'string' ? new Date(date) : date;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[tourDate.getDay()];
}

/**
 * Check if date is eligible for shared tour
 */
export function isSharedTourDay(date: Date | string): boolean {
  const rates = getRates();
  const dayName = getDayOfWeek(date);
  return rates.shared_tours.days.includes(dayName);
}
