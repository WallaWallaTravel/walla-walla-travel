/**
 * Date Formatting Utilities
 *
 * Centralized date formatting to replace 200+ scattered implementations.
 * All functions are pure (no side effects) and timezone-aware.
 *
 * @module lib/utils/date-format
 */

// ============================================================================
// ISO / Database Formats
// ============================================================================

/**
 * Get current ISO timestamp string.
 * Replaces: `new Date().toISOString()`
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Get today's date as YYYY-MM-DD string.
 * Replaces: `new Date().toISOString().split('T')[0]`
 */
export function todayDate(): string {
  return toDateString(new Date());
}

/**
 * Convert a Date or ISO string to YYYY-MM-DD format.
 * Replaces: `d.toISOString().split('T')[0]` (65+ occurrences)
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// ============================================================================
// Display Formats (for UI / emails)
// ============================================================================

/**
 * Format a date for display: "Friday, March 15, 2025"
 * Replaces 98+ inline `.toLocaleDateString()` calls with varying options.
 *
 * Appends 'T00:00:00' when given a date-only string to avoid timezone shifts.
 */
export function formatDisplayDate(dateString: string): string {
  // If it's a date-only string (YYYY-MM-DD), append time to avoid TZ shift
  const d = dateString.length === 10
    ? new Date(dateString + 'T00:00:00')
    : new Date(dateString);

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date as short display: "Mar 15, 2025"
 */
export function formatShortDate(dateString: string): string {
  const d = dateString.length === 10
    ? new Date(dateString + 'T00:00:00')
    : new Date(dateString);

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time: "Mar 15, 2025 at 2:30 PM"
 */
export function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  const datePart = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a string is a valid date.
 */
export function isValidDate(dateString: string): boolean {
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Check if a start date is before or equal to an end date.
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  return new Date(startDate) <= new Date(endDate);
}

// ============================================================================
// Arithmetic
// ============================================================================

/**
 * Add days to a date, return as YYYY-MM-DD string.
 */
export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}
