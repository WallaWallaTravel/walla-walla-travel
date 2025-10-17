/**
 * Hours of Service (HOS) Configuration for Passenger-Carrying Vehicles
 * FMCSA Part 395.5 - Passenger-carrying vehicle regulations
 * 
 * CRITICAL: This is for WINE TOUR operations = PASSENGER vehicles, NOT freight!
 */

export const HOS_LIMITS = {
  // Daily Limits (Part 395.5)
  MAX_ON_DUTY_HOURS: 15,        // 15-hour on-duty limit (NOT 14 for freight!)
  MAX_DRIVING_HOURS: 10,        // 10-hour driving limit (NOT 11 for freight!)
  MIN_OFF_DUTY_HOURS: 8,        // 8 consecutive hours off-duty required
  
  // Weekly/Multi-day Limits
  MAX_HOURS_8_DAYS: 70,         // 70 hours in 8 consecutive days
  MAX_HOURS_7_DAYS: 60,         // 60 hours in 7 consecutive days (alternative)
  
  // 150 Air-Mile Exemption (Part 395.1(e)(1))
  AIR_MILE_RADIUS: 150,          // 150 air-mile radius from work reporting location
  SHORT_HAUL_MAX_ON_DUTY: 16,    // Can extend to 16 hours twice per week
  SHORT_HAUL_MIN_OFF_DUTY: 8,    // Still need 8 consecutive hours off
  
  // Break Requirements
  PROPERTY_30_MIN_BREAK: false,  // 30-minute break NOT required for passenger vehicles
  
  // Restart Provision
  RESTART_HOURS: 34,             // 34-hour restart resets weekly limits
  
  // Warning Thresholds (trigger alerts before violations)
  WARNING_ON_DUTY_HOURS: 14,     // Warn at 14 hours (1 hour before limit)
  WARNING_DRIVING_HOURS: 9.5,    // Warn at 9.5 hours (30 min before limit)
  WARNING_WEEKLY_HOURS: 65,      // Warn at 65 hours (5 hours before limit)
} as const;

/**
 * Calculate if driver is within 150 air-mile exemption
 * @param lat1 Work reporting location latitude
 * @param lon1 Work reporting location longitude
 * @param lat2 Current location latitude
 * @param lon2 Current location longitude
 * @returns Distance in air miles
 */
export function calculateAirMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Check if driver qualifies for 150 air-mile exemption
 * Requirements:
 * 1. Returns to work reporting location
 * 2. Released from duty within 14 hours (can extend to 16 twice per week)
 * 3. Operates within 150 air-mile radius
 */
export function qualifiesFor150AirMileExemption(
  workReportingLat: number,
  workReportingLon: number,
  currentLat: number,
  currentLon: number,
  onDutyHours: number,
  weeklyExtensionsUsed: number
): { qualifies: boolean; reason?: string } {
  // Check distance
  const distance = calculateAirMiles(workReportingLat, workReportingLon, currentLat, currentLon);
  if (distance > HOS_LIMITS.AIR_MILE_RADIUS) {
    return {
      qualifies: false,
      reason: `Outside 150 air-mile radius (${distance.toFixed(1)} miles from base)`
    };
  }
  
  // Check hours (can extend to 16 hours twice per week)
  const maxHours = weeklyExtensionsUsed < 2 ? HOS_LIMITS.SHORT_HAUL_MAX_ON_DUTY : HOS_LIMITS.MAX_ON_DUTY_HOURS;
  if (onDutyHours > maxHours) {
    return {
      qualifies: false,
      reason: `Exceeds ${maxHours}-hour limit (${onDutyHours.toFixed(2)} hours on duty)`
    };
  }
  
  return { qualifies: true };
}

/**
 * Calculate remaining available hours for a driver
 */
export function calculateAvailableHours(
  currentOnDutyHours: number,
  weeklyHours: number,
  isDriving: boolean = false
): {
  dailyOnDutyRemaining: number;
  dailyDrivingRemaining: number;
  weeklyRemaining: number;
  mostRestrictive: number;
  warnings: string[];
} {
  const dailyOnDutyRemaining = Math.max(0, HOS_LIMITS.MAX_ON_DUTY_HOURS - currentOnDutyHours);
  const dailyDrivingRemaining = isDriving ? Math.max(0, HOS_LIMITS.MAX_DRIVING_HOURS - currentOnDutyHours) : HOS_LIMITS.MAX_DRIVING_HOURS;
  const weeklyRemaining = Math.max(0, HOS_LIMITS.MAX_HOURS_8_DAYS - weeklyHours);
  
  const mostRestrictive = Math.min(dailyOnDutyRemaining, dailyDrivingRemaining, weeklyRemaining);
  
  const warnings: string[] = [];
  
  if (currentOnDutyHours >= HOS_LIMITS.WARNING_ON_DUTY_HOURS) {
    warnings.push(`Approaching 15-hour on-duty limit (${currentOnDutyHours.toFixed(1)} hours)`);
  }
  
  if (isDriving && currentOnDutyHours >= HOS_LIMITS.WARNING_DRIVING_HOURS) {
    warnings.push(`Approaching 10-hour driving limit (${currentOnDutyHours.toFixed(1)} hours)`);
  }
  
  if (weeklyHours >= HOS_LIMITS.WARNING_WEEKLY_HOURS) {
    warnings.push(`Approaching 70-hour weekly limit (${weeklyHours.toFixed(1)} hours)`);
  }
  
  return {
    dailyOnDutyRemaining,
    dailyDrivingRemaining,
    weeklyRemaining,
    mostRestrictive,
    warnings
  };
}

/**
 * Validate HOS compliance for a shift
 */
export function validateHOSCompliance(
  onDutyHours: number,
  drivingHours: number,
  weeklyHours: number,
  lastOffDutyHours: number
): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  if (onDutyHours > HOS_LIMITS.MAX_ON_DUTY_HOURS) {
    violations.push(`On-duty time (${onDutyHours.toFixed(2)} hours) exceeds 15-hour limit`);
  }
  
  if (drivingHours > HOS_LIMITS.MAX_DRIVING_HOURS) {
    violations.push(`Driving time (${drivingHours.toFixed(2)} hours) exceeds 10-hour limit`);
  }
  
  if (weeklyHours > HOS_LIMITS.MAX_HOURS_8_DAYS) {
    violations.push(`Weekly hours (${weeklyHours.toFixed(2)}) exceeds 70-hour/8-day limit`);
  }
  
  if (lastOffDutyHours < HOS_LIMITS.MIN_OFF_DUTY_HOURS) {
    violations.push(`Insufficient off-duty time (${lastOffDutyHours.toFixed(2)} hours, need 8)`);
  }
  
  return {
    compliant: violations.length === 0,
    violations
  };
}

// Walla Walla base location (for 150 air-mile calculations)
export const WALLA_WALLA_BASE = {
  latitude: 46.0646,
  longitude: -118.3430,
  address: 'Walla Walla, WA'
};