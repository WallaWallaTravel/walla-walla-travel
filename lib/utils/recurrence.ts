/**
 * Recurrence Date Generator
 *
 * Pure function that generates instance dates for recurring events.
 * No database dependencies — takes a start date and rule, returns an array of date strings.
 */

import type { RecurrenceRule } from '@/lib/types/events';

const MAX_INSTANCES = 52;

/**
 * Generate all instance dates for a recurring event.
 *
 * @param startDate - YYYY-MM-DD format, the first instance date
 * @param rule - The recurrence rule defining frequency and end condition
 * @returns Array of YYYY-MM-DD strings (including startDate as first entry)
 */
export function generateInstanceDates(
  startDate: string,
  rule: RecurrenceRule
): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);

  switch (rule.frequency) {
    case 'weekly':
      return generateWeekly(start, rule, 7);
    case 'biweekly':
      return generateWeekly(start, rule, 14);
    case 'monthly':
      return generateMonthly(start, rule);
    default:
      return [startDate];
  }

  return dates;
}

/**
 * Generate dates for weekly/biweekly recurrence.
 * For weekly: advances 7 days. For biweekly: advances 14 days.
 * Filters to matching days_of_week if specified.
 */
function generateWeekly(
  start: Date,
  rule: RecurrenceRule,
  intervalDays: number
): string[] {
  const dates: string[] = [];
  const maxDate = rule.end_type === 'until_date' && rule.until_date
    ? parseDate(rule.until_date)
    : null;
  const maxCount = rule.end_type === 'count' && rule.count
    ? Math.min(rule.count, MAX_INSTANCES)
    : MAX_INSTANCES;

  const daysOfWeek = rule.days_of_week && rule.days_of_week.length > 0
    ? new Set(rule.days_of_week)
    : null;

  // Always include the start date as the first instance
  dates.push(formatDate(start));

  // Generate subsequent dates
  const current = new Date(start);
  current.setDate(current.getDate() + intervalDays);

  while (dates.length < maxCount) {
    if (maxDate && current > maxDate) break;

    if (daysOfWeek) {
      // For multi-day selections within a week interval, iterate through the week
      // and pick matching days. But the standard case is one day per interval.
      if (daysOfWeek.has(current.getDay())) {
        dates.push(formatDate(current));
      }
    } else {
      dates.push(formatDate(current));
    }

    current.setDate(current.getDate() + intervalDays);

    // Safety: never exceed hard cap
    if (dates.length >= MAX_INSTANCES) break;
  }

  return dates;
}

/**
 * Generate dates for monthly recurrence.
 * Uses the same day-of-month each month (capped at 28 to avoid month-end issues).
 */
function generateMonthly(
  start: Date,
  rule: RecurrenceRule
): string[] {
  const dates: string[] = [];
  const maxDate = rule.end_type === 'until_date' && rule.until_date
    ? parseDate(rule.until_date)
    : null;
  const maxCount = rule.end_type === 'count' && rule.count
    ? Math.min(rule.count, MAX_INSTANCES)
    : MAX_INSTANCES;

  const dayOfMonth = rule.day_of_month || Math.min(start.getDate(), 28);

  // First instance is the start date
  dates.push(formatDate(start));

  let currentMonth = start.getMonth() + 1;
  let currentYear = start.getFullYear();

  while (dates.length < maxCount) {
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }

    const date = new Date(currentYear, currentMonth, dayOfMonth);

    // Verify the date didn't roll over (e.g., Feb 30 -> Mar 2)
    if (date.getDate() !== dayOfMonth) {
      currentMonth++;
      continue;
    }

    if (maxDate && date > maxDate) break;

    dates.push(formatDate(date));
    currentMonth++;

    if (dates.length >= MAX_INSTANCES) break;
  }

  return dates;
}

/**
 * Parse a YYYY-MM-DD string into a Date object (local timezone).
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
