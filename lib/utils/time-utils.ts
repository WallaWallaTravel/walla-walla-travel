/**
 * Time Utilities
 * 
 * Shared utilities for time calculations used across the application.
 * Consolidates duplicate time logic from multiple components.
 */

/**
 * Add minutes to a time string (HH:MM format)
 */
export function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Get the difference in minutes between two time strings
 */
export function getMinutesDifference(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  
  const startTotal = startHours * 60 + startMins;
  const endTotal = endHours * 60 + endMins;
  
  return Math.max(0, endTotal - startTotal);
}

/**
 * Check if a time falls within a range
 */
export function isTimeBetween(
  time: string, 
  startTime: string, 
  endTime: string
): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const timeMinutes = hours * 60 + minutes;
  const startMinutes_ = startHours * 60 + startMinutes;
  const endMinutes_ = endHours * 60 + endMinutes;
  
  return timeMinutes >= startMinutes_ && timeMinutes <= endMinutes_;
}

/**
 * Check if a time is during lunch hours (12:00 PM - 2:00 PM)
 */
export function isLunchTime(time: string): boolean {
  return isTimeBetween(time, '12:00', '14:00');
}

/**
 * Format minutes into hours and minutes string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
}

/**
 * Parse a duration string (e.g., "2 hours 30 minutes") into total minutes
 */
export function parseDuration(duration: string): number {
  const hourMatch = duration.match(/(\d+)\s*(?:hour|hr)/i);
  const minMatch = duration.match(/(\d+)\s*(?:minute|min)/i);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minMatch ? parseInt(minMatch[1]) : 0;
  
  return hours * 60 + minutes;
}

/**
 * Get current time in HH:MM format
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 */
export function to12HourFormat(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Convert 12-hour time with AM/PM to 24-hour format
 */
export function to24HourFormat(time12: string): string {
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;
  
  let [, hours, minutes, period] = match;
  let hours24 = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hours24 !== 12) {
    hours24 += 12;
  } else if (period.toUpperCase() === 'AM' && hours24 === 12) {
    hours24 = 0;
  }
  
  return `${String(hours24).padStart(2, '0')}:${minutes}`;
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Round time to nearest interval (e.g., 15 minutes)
 */
export function roundTimeToInterval(time: string, intervalMinutes: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  const roundedMinutes = Math.round(totalMinutes / intervalMinutes) * intervalMinutes;
  
  const newHours = Math.floor(roundedMinutes / 60) % 24;
  const newMinutes = roundedMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}




