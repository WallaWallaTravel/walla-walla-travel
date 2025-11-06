/**
 * Smart Time Parser Utility
 * 
 * Parses various time input formats and intelligently determines AM/PM
 * based on service type and business context.
 * 
 * Examples:
 *   parseTime('115', { serviceType: 'wine_tour' }) → 01:15 PM
 *   parseTime('930', { serviceType: 'transfer' }) → 09:30 AM
 *   parseTime('7', { serviceType: 'wine_tour' }) → 07:00 PM
 */

export type ServiceType = 
  | 'wine_tour' 
  | 'airport_transfer' 
  | 'local_transfer' 
  | 'regional_transfer' 
  | 'wait_time' 
  | 'custom';

export interface TimeParseOptions {
  serviceType?: ServiceType;
  defaultPeriod?: 'AM' | 'PM';
}

export interface ParsedTime {
  hours: number;                          // 1-12 (12-hour format)
  minutes: number;                        // 0-59
  period: 'AM' | 'PM';
  formatted: string;                      // "01:15 PM"
  iso: string;                            // "13:15:00" (24-hour format)
  hours24: number;                        // 0-23 (24-hour format)
}

/**
 * Determine smart AM/PM based on service type and hour
 */
export function determineSmartPeriod(
  hour: number, 
  serviceType?: ServiceType
): 'AM' | 'PM' {
  // Wine Tours (9am-6pm typical)
  if (serviceType === 'wine_tour') {
    if (hour >= 9 && hour <= 11) return 'AM';
    if (hour === 12 || (hour >= 1 && hour <= 6)) return 'PM';
    if (hour >= 7 && hour <= 8) return 'PM';  // Rare but possible
  }

  // Transfers (wider range: 5am-11pm)
  if (
    serviceType === 'transfer' || 
    serviceType === 'airport_transfer' || 
    serviceType === 'local_transfer' ||
    serviceType === 'regional_transfer'
  ) {
    if (hour >= 5 && hour <= 11) return 'AM';
    if (hour === 12 || (hour >= 1 && hour <= 11)) return 'PM';
  }

  // Wait Time / Custom (business hours default)
  if (hour >= 8 && hour <= 11) return 'AM';
  if (hour === 12 || (hour >= 1 && hour <= 7)) return 'PM';
  
  // Default fallback for edge cases
  return 'PM';
}

/**
 * Parse various time input formats into structured time
 * 
 * Supported formats:
 *   - Single digit: "7" → 07:00
 *   - Two digits: "11" → 11:00
 *   - Three digits: "115" → 01:15
 *   - Four digits: "0930" → 09:30
 *   - With colon: "1:15" → 01:15
 *   - With space: "1 15" → 01:15
 */
export function parseTime(input: string, options?: TimeParseOptions): ParsedTime | null {
  if (!input || input.trim() === '') return null;

  // Clean input: remove spaces, colons, periods
  const cleaned = input.trim().replace(/[:\s.]/g, '');
  
  // Must be numeric
  if (!/^\d+$/.test(cleaned)) return null;

  let hours = 0;
  let minutes = 0;

  const len = cleaned.length;

  if (len === 1 || len === 2) {
    // Single or double digit: just hours (e.g., "7" or "11")
    hours = parseInt(cleaned, 10);
    minutes = 0;
  } else if (len === 3) {
    // Three digits: first digit is hour, last two are minutes (e.g., "115" → 1:15)
    hours = parseInt(cleaned[0], 10);
    minutes = parseInt(cleaned.slice(1), 10);
  } else if (len === 4) {
    // Four digits: first two are hours, last two are minutes (e.g., "0930" → 9:30)
    hours = parseInt(cleaned.slice(0, 2), 10);
    minutes = parseInt(cleaned.slice(2), 10);
  } else {
    // Too many digits
    return null;
  }

  // Validate ranges
  if (hours < 1 || hours > 12) return null;
  if (minutes < 0 || minutes > 59) return null;

  // Determine AM/PM
  const period = options?.defaultPeriod || determineSmartPeriod(hours, options?.serviceType);

  // Convert to 24-hour format
  let hours24 = hours;
  if (period === 'PM' && hours !== 12) {
    hours24 = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hours24 = 0;
  }

  // Format strings
  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  const iso = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  return {
    hours,
    minutes,
    period,
    formatted,
    iso,
    hours24
  };
}

/**
 * Toggle AM/PM on a parsed time
 */
export function togglePeriod(time: ParsedTime): ParsedTime {
  const newPeriod = time.period === 'AM' ? 'PM' : 'AM';
  
  // Recalculate 24-hour format
  let hours24 = time.hours;
  if (newPeriod === 'PM' && time.hours !== 12) {
    hours24 = time.hours + 12;
  } else if (newPeriod === 'AM' && time.hours === 12) {
    hours24 = 0;
  }

  const formatted = `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')} ${newPeriod}`;
  const iso = `${hours24.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:00`;

  return {
    ...time,
    period: newPeriod,
    hours24,
    formatted,
    iso
  };
}

/**
 * Parse an ISO time string (HH:MM:SS or HH:MM) into ParsedTime
 */
export function parseISOTime(isoTime: string): ParsedTime | null {
  if (!isoTime) return null;

  const parts = isoTime.split(':');
  if (parts.length < 2) return null;

  const hours24 = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours24) || isNaN(minutes)) return null;
  if (hours24 < 0 || hours24 > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  // Convert to 12-hour format
  let hours = hours24;
  let period: 'AM' | 'PM' = 'AM';

  if (hours24 === 0) {
    hours = 12;
    period = 'AM';
  } else if (hours24 === 12) {
    hours = 12;
    period = 'PM';
  } else if (hours24 > 12) {
    hours = hours24 - 12;
    period = 'PM';
  } else {
    period = 'AM';
  }

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  const iso = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  return {
    hours,
    minutes,
    period,
    formatted,
    iso,
    hours24
  };
}

/**
 * Format a ParsedTime for display
 */
export function formatTime(time: ParsedTime): string {
  return time.formatted;
}

/**
 * Convert ParsedTime to ISO format for database storage
 */
export function toISO(time: ParsedTime): string {
  return time.iso;
}

/**
 * Get current time as ParsedTime
 */
export function getCurrentTime(): ParsedTime {
  const now = new Date();
  const hours24 = now.getHours();
  const minutes = now.getMinutes();

  let hours = hours24;
  let period: 'AM' | 'PM' = 'AM';

  if (hours24 === 0) {
    hours = 12;
    period = 'AM';
  } else if (hours24 === 12) {
    hours = 12;
    period = 'PM';
  } else if (hours24 > 12) {
    hours = hours24 - 12;
    period = 'PM';
  } else {
    period = 'AM';
  }

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  const iso = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  return {
    hours,
    minutes,
    period,
    formatted,
    iso,
    hours24
  };
}

