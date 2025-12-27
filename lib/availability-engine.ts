/**
 * Availability Engine
 *
 * Calculates real-time availability for bookings based on:
 * - Vehicle availability (via vehicle_availability_blocks with exclusion constraint)
 * - Driver availability (HOS limits)
 * - Existing bookings
 * - Buffer times
 * - Blackout dates
 *
 * This module now delegates to VehicleAvailabilityService for core availability
 * checking, leveraging the PostgreSQL exclusion constraint for bulletproof
 * double-booking prevention.
 */

import { vehicleAvailabilityService } from './services/vehicle-availability.service';
import { queryMany } from './db-helpers';

// ============================================================================
// Types
// ============================================================================

interface AvailabilityRequest {
  date: string;
  duration_hours: number;
  party_size: number;
  start_time?: string;
  brand_id?: number;
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

// ============================================================================
// Main Availability Check
// ============================================================================

/**
 * Check if a specific date/time is available
 * Delegates to VehicleAvailabilityService for constraint-backed checking
 */
export async function checkAvailability(
  request: AvailabilityRequest
): Promise<AvailabilityResult> {
  const { date, duration_hours, party_size, start_time, brand_id } = request;

  // If specific time requested, check that slot
  if (start_time) {
    const result = await vehicleAvailabilityService.checkAvailability({
      date,
      startTime: start_time,
      durationHours: duration_hours,
      partySize: party_size,
      brandId: brand_id
    });

    return {
      available: result.available,
      available_times: result.available ? [{
        start: start_time,
        end: addHours(start_time, duration_hours),
        available: true,
        vehicle_id: result.vehicle_id || undefined,
        vehicle_name: result.vehicle_name || undefined
      }] : [],
      suggested_vehicle: result.vehicle_id ? {
        id: result.vehicle_id,
        type: result.vehicle_capacity && result.vehicle_capacity >= 10 ? 'sprinter' : 'sedan',
        capacity: result.vehicle_capacity || 0,
        name: result.vehicle_name || ''
      } : null,
      conflicts: result.conflicts
    };
  }

  // No specific time - get all available slots for the day
  const availableSlots = await vehicleAvailabilityService.getAvailableSlots({
    date,
    durationHours: duration_hours,
    partySize: party_size,
    brandId: brand_id
  });

  // Find first available slot to get suggested vehicle
  const firstAvailable = availableSlots.find(slot => slot.available);

  return {
    available: availableSlots.some(slot => slot.available),
    available_times: availableSlots,
    suggested_vehicle: firstAvailable?.vehicle_id ? {
      id: firstAvailable.vehicle_id,
      type: 'sprinter', // Default to sprinter for wine tours
      capacity: 14,
      name: firstAvailable.vehicle_name || ''
    } : null,
    conflicts: availableSlots.every(slot => !slot.available)
      ? ['No time slots available for this date']
      : []
  };
}

/**
 * Get available dates for a month
 * Uses the new vehicle availability system
 */
export async function getAvailableDates(
  year: number,
  month: number,
  partySize: number = 1,
  brandId?: number
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

  const availableDates: string[] = [];
  const currentDate = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Minimum booking window (48 hours)
  const minBookingDate = new Date();
  minBookingDate.setHours(minBookingDate.getHours() + 48);
  minBookingDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Skip if blackout date
    if (blackoutSet.has(dateStr)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Skip if past date or within minimum booking window
    if (currentDate < minBookingDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if any time slot is available on this date
    const slots = await vehicleAvailabilityService.getAvailableSlots({
      date: dateStr,
      durationHours: 4, // Minimum tour duration
      partySize,
      brandId
    });

    if (slots.some(slot => slot.available)) {
      availableDates.push(dateStr);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableDates;
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableTimeSlots(
  date: string,
  durationHours: number,
  partySize: number,
  brandId?: number
): Promise<TimeSlot[]> {
  return vehicleAvailabilityService.getAvailableSlots({
    date,
    durationHours,
    partySize,
    brandId
  });
}

/**
 * Check if a specific vehicle is available at a given time
 */
export async function checkVehicleAvailability(
  vehicleId: number,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; conflicts: string[] }> {
  const result = await vehicleAvailabilityService.checkVehicleAvailability(
    vehicleId,
    date,
    startTime,
    endTime
  );

  return {
    available: result.available,
    conflicts: result.conflicts.map(c =>
      `Conflict with ${c.block_type} block from ${c.start_time} to ${c.end_time}`
    )
  };
}

/**
 * Find all available vehicles for a time slot
 */
export async function findAvailableVehicles(
  date: string,
  startTime: string,
  endTime: string,
  partySize: number,
  brandId?: number
): Promise<Array<{
  id: number;
  name: string;
  capacity: number;
  type: string;
}>> {
  const vehicles = await vehicleAvailabilityService.findAvailableVehicles({
    date,
    startTime,
    endTime,
    partySize,
    brandId
  });

  return vehicles.map(v => ({
    id: v.id,
    name: v.name,
    capacity: v.capacity,
    type: v.vehicle_type
  }));
}

/**
 * Get calendar view data for a date range
 * Returns blocks organized by vehicle (swim lanes)
 */
export async function getCalendarData(
  startDate: string,
  endDate: string,
  vehicleId?: number
): Promise<{
  blocks: Array<{
    id: number;
    vehicle_id: number;
    vehicle_name: string;
    block_date: string;
    start_time: string;
    end_time: string;
    block_type: string;
    booking_id: number | null;
    booking_number?: string;
    notes: string | null;
  }>;
}> {
  const blocks = await vehicleAvailabilityService.getBlocksInRange(
    startDate,
    endDate,
    vehicleId
  );

  return {
    blocks: blocks.map(b => ({
      id: b.id,
      vehicle_id: b.vehicle_id,
      vehicle_name: (b as any).vehicle_name || '',
      block_date: b.block_date,
      start_time: b.start_time,
      end_time: b.end_time,
      block_type: b.block_type,
      booking_id: b.booking_id,
      notes: b.notes
    }))
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add hours to a time string
 */
function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// ============================================================================
// Legacy Compatibility Exports
// ============================================================================

// These exports maintain backward compatibility with existing code
export {
  checkAvailability as checkTourAvailability,
  getAvailableDates as getTourAvailableDates,
  getAvailableTimeSlots as getTourTimeSlots
};
