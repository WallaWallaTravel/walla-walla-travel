/**
 * Availability Engine
 * Calculates real-time availability for bookings based on:
 * - Vehicle availability
 * - Driver availability (HOS limits)
 * - Existing bookings
 * - Buffer times
 * - Blackout dates
 */

import { queryMany, queryOne } from './db-helpers';

interface AvailabilityRequest {
  date: string;
  duration_hours: number;
  party_size: number;
  start_time?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  vehicle_id?: number;
  vehicle_name?: string;
}

interface AvailabilityResult {
  available: boolean;
  available_times: TimeSlot[];
  suggested_vehicle: {
    id: number;
    type: string;
    capacity: number;
    name: string;
  } | null;
  conflicts: string[];
}

/**
 * Check if a specific date/time is available
 */
export async function checkAvailability(
  request: AvailabilityRequest
): Promise<AvailabilityResult> {
  const { date, duration_hours, party_size, start_time } = request;

  // 1. Check if date is in the past
  const requestDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestDate < today) {
    return {
      available: false,
      available_times: [],
      suggested_vehicle: null,
      conflicts: ['Cannot book tours in the past']
    };
  }

  // 2. Check if date is within booking window (48 hours minimum, 120 days maximum)
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 48);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 120);

  if (requestDate < minDate) {
    return {
      available: false,
      available_times: [],
      suggested_vehicle: null,
      conflicts: ['Bookings require 48-hour advance notice']
    };
  }

  if (requestDate > maxDate) {
    return {
      available: false,
      available_times: [],
      suggested_vehicle: null,
      conflicts: ['Cannot book more than 120 days in advance']
    };
  }

  // 3. Check for blackout dates
  const blackoutDates = await queryMany<{ blackout_date: string; reason: string }>(
    `SELECT blackout_date, reason 
     FROM availability_rules 
     WHERE rule_type = 'blackout_date' 
     AND is_active = true 
     AND blackout_date = $1`,
    [date]
  );

  if (blackoutDates.length > 0) {
    return {
      available: false,
      available_times: [],
      suggested_vehicle: null,
      conflicts: blackoutDates.map(bd => bd.reason || 'Date unavailable')
    };
  }

  // 4. Find suitable vehicle based on party size
  const vehicle = await findSuitableVehicle(party_size);

  if (!vehicle) {
    return {
      available: false,
      available_times: [],
      suggested_vehicle: null,
      conflicts: [`No vehicles available for party size of ${party_size}`]
    };
  }

  // 5. Get existing bookings for this date and vehicle
  const existingBookings = await queryMany<{
    start_time: string;
    end_time: string;
    booking_number: string;
  }>(
    `SELECT b.start_time, b.end_time, b.booking_number
     FROM bookings b
     LEFT JOIN vehicle_assignments va ON b.id = va.booking_id
     WHERE b.tour_date = $1
     AND (va.vehicle_id = $2 OR va.vehicle_id IS NULL)
     AND b.status NOT IN ('cancelled')
     ORDER BY b.start_time`,
    [date, vehicle.id]
  );

  // 6. Calculate available time slots
  const availableSlots = calculateAvailableSlots(
    existingBookings,
    duration_hours,
    start_time
  );

  // 7. Check specific time if provided
  if (start_time) {
    const isAvailable = availableSlots.some(
      slot => slot.start === start_time && slot.available
    );

    return {
      available: isAvailable,
      available_times: availableSlots,
      suggested_vehicle: vehicle,
      conflicts: isAvailable ? [] : ['Requested time slot is not available']
    };
  }

  return {
    available: availableSlots.some(slot => slot.available),
    available_times: availableSlots,
    suggested_vehicle: vehicle,
    conflicts: []
  };
}

/**
 * Find suitable vehicle based on party size
 */
async function findSuitableVehicle(party_size: number): Promise<{
  id: number;
  type: string;
  capacity: number;
  name: string;
} | null> {
  // Query vehicles that can accommodate the party size
  const vehicles = await queryMany<{
    id: number;
    make: string;
    model: string;
    capacity: number;
    status: string;
  }>(
    `SELECT id, make, model, capacity, status
     FROM vehicles
     WHERE capacity >= $1
     AND status = 'active'
     ORDER BY capacity ASC
     LIMIT 1`,
    [party_size]
  );

  if (vehicles.length === 0) return null;

  const vehicle = vehicles[0];

  return {
    id: vehicle.id,
    type: vehicle.capacity >= 10 ? 'sprinter' : 'sedan',
    capacity: vehicle.capacity,
    name: `${vehicle.make} ${vehicle.model}`
  };
}

/**
 * Calculate available time slots for a given date
 */
function calculateAvailableSlots(
  existingBookings: Array<{ start_time: string; end_time: string }>,
  duration_hours: number,
  requestedTime?: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const bufferMinutes = 60; // 60-minute buffer between bookings

  // Operating hours: 8 AM to 6 PM
  const dayStart = '08:00';
  const dayEnd = '18:00';

  // If specific time requested, only check that slot
  if (requestedTime) {
    const endTime = addHours(requestedTime, duration_hours);
    const hasConflict = checkTimeConflict(
      requestedTime,
      endTime,
      existingBookings,
      bufferMinutes
    );

    return [{
      start: requestedTime,
      end: endTime,
      available: !hasConflict
    }];
  }

  // Generate hourly slots from 8 AM to 6 PM
  let currentTime = dayStart;
  const lastStartTime = subtractHours(dayEnd, duration_hours);

  while (timeToMinutes(currentTime) <= timeToMinutes(lastStartTime)) {
    const endTime = addHours(currentTime, duration_hours);
    const hasConflict = checkTimeConflict(
      currentTime,
      endTime,
      existingBookings,
      bufferMinutes
    );

    slots.push({
      start: currentTime,
      end: endTime,
      available: !hasConflict
    });

    // Move to next hour
    currentTime = addHours(currentTime, 1);
  }

  return slots;
}

/**
 * Check if a time slot conflicts with existing bookings
 */
function checkTimeConflict(
  start: string,
  end: string,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  bufferMinutes: number
): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  for (const booking of existingBookings) {
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);

    // Check if times overlap (with buffer)
    if (
      (startMinutes >= bookingStart - bufferMinutes && startMinutes < bookingEnd + bufferMinutes) ||
      (endMinutes > bookingStart - bufferMinutes && endMinutes <= bookingEnd + bufferMinutes) ||
      (startMinutes <= bookingStart && endMinutes >= bookingEnd)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Add hours to a time string
 */
function addHours(time: string, hours: number): string {
  const minutes = timeToMinutes(time) + hours * 60;
  const newHours = Math.floor(minutes / 60);
  const newMinutes = minutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Subtract hours from a time string
 */
function subtractHours(time: string, hours: number): string {
  const minutes = timeToMinutes(time) - hours * 60;
  const newHours = Math.floor(minutes / 60);
  const newMinutes = minutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Get available dates for a month
 */
export async function getAvailableDates(
  year: number,
  month: number
): Promise<string[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Get all blackout dates for the month
  const blackoutDates = await queryMany<{ blackout_date: string }>(
    `SELECT blackout_date 
     FROM availability_rules 
     WHERE rule_type = 'blackout_date' 
     AND is_active = true 
     AND blackout_date >= $1 
     AND blackout_date <= $2`,
    [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
  );

  const blackoutSet = new Set(blackoutDates.map(bd => bd.blackout_date));

  // Get all dates with bookings
  const bookingDates = await queryMany<{ tour_date: string; booking_count: number }>(
    `SELECT tour_date, COUNT(*) as booking_count
     FROM bookings
     WHERE tour_date >= $1 
     AND tour_date <= $2
     AND status NOT IN ('cancelled')
     GROUP BY tour_date`,
    [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
  );

  const availableDates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Skip if blackout date
    if (blackoutSet.has(dateStr)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Skip if past date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (currentDate < today) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if date has capacity (assuming max 3 bookings per day)
    const bookingCount = bookingDates.find(bd => bd.tour_date === dateStr)?.booking_count || 0;
    if (bookingCount < 3) {
      availableDates.push(dateStr);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableDates;
}

