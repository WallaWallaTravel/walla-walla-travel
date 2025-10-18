import { NextRequest } from 'next/server';
import { validate, checkAvailabilitySchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * POST /api/bookings/check-availability
 *
 * Check availability for a specific date, duration, and party size.
 * Returns available time slots and pricing information.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validate(request, checkAvailabilitySchema);
    if (!validation.success) {
      return validation.error;
    }

    const { date, duration_hours, party_size, vehicle_type } = validation.data;

    // Determine vehicle type based on party size if not specified
    const selectedVehicleType = vehicle_type || (party_size <= 4 ? 'luxury_sedan' : 'sprinter');

    // 1. Get availability rules
    const availabilityRulesResult = await query(
      `SELECT * FROM availability_rules WHERE is_active = true`,
      []
    );
    const availabilityRules = availabilityRulesResult.rows;

    // 2. Check for blackout dates
    const blackoutResult = await query(
      `SELECT * FROM availability_rules
       WHERE rule_type = 'blackout_date'
       AND is_active = true
       AND (
         blackout_date = $1
         OR ($1 >= blackout_start_date AND $1 <= blackout_end_date)
       )`,
      [date]
    );

    if (blackoutResult.rows.length > 0) {
      return successResponse({
        available: false,
        reason: 'Date is blocked',
        blackout_reason: blackoutResult.rows[0].reason || 'This date is not available for bookings'
      });
    }

    // 3. Get capacity limits
    const capacityRule = availabilityRules.find(r => r.rule_type === 'capacity_limit');
    const maxConcurrentBookings = capacityRule?.max_concurrent_bookings || 3;
    const maxDailyBookings = capacityRule?.max_daily_bookings || 5;

    // 4. Check existing bookings for the date
    const existingBookingsResult = await query(
      `SELECT id, start_time, end_time, vehicle_id, status
       FROM bookings
       WHERE tour_date = $1
       AND status NOT IN ('cancelled', 'completed')
       ORDER BY start_time`,
      [date]
    );
    const existingBookings = existingBookingsResult.rows;

    // Check if we've hit daily booking limit
    if (existingBookings.length >= maxDailyBookings) {
      return successResponse({
        available: false,
        reason: 'Daily booking limit reached',
        message: 'Unfortunately, this date is fully booked. Please try another date.'
      });
    }

    // 5. Get buffer time requirements
    const bufferRule = availabilityRules.find(r => r.rule_type === 'buffer_time');
    const bufferMinutes = bufferRule?.buffer_minutes || 120; // Default 2 hours

    // 6. Generate available time slots
    const availableTimes = generateAvailableTimeSlots(
      existingBookings,
      duration_hours,
      bufferMinutes,
      maxConcurrentBookings
    );

    if (availableTimes.length === 0) {
      return successResponse({
        available: false,
        reason: 'No available time slots',
        message: 'No available time slots for this date and duration. Please try another date.',
        existing_bookings_count: existingBookings.length
      });
    }

    // 7. Get suggested vehicle
    const suggestedVehicleResult = await query(
      `SELECT id, name, license_plate, capacity, vehicle_type
       FROM vehicles
       WHERE vehicle_type = $1
       AND capacity >= $2
       AND is_active = true
       AND is_operational = true
       ORDER BY capacity ASC
       LIMIT 1`,
      [selectedVehicleType, party_size]
    );

    const suggestedVehicle = suggestedVehicleResult.rows[0] || null;

    if (!suggestedVehicle) {
      return successResponse({
        available: false,
        reason: 'No suitable vehicle available',
        message: `No vehicles available for party size of ${party_size}. Maximum capacity is 14 passengers.`
      });
    }

    // 8. Calculate pricing
    const pricing = await calculatePricing(date, duration_hours, selectedVehicleType);

    return successResponse({
      available: true,
      available_times: availableTimes,
      suggested_vehicle: {
        id: suggestedVehicle.id,
        type: suggestedVehicle.vehicle_type,
        capacity: suggestedVehicle.capacity,
        name: suggestedVehicle.name
      },
      pricing: {
        base_price: pricing.base_price,
        estimated_gratuity: pricing.estimated_gratuity,
        taxes: pricing.taxes,
        total: pricing.total,
        deposit_required: pricing.deposit_required
      },
      booking_window: {
        min_advance_hours: 48,
        max_advance_days: 120
      }
    });

  } catch (error) {
    console.error('❌ Check availability error:', error);
    return errorResponse('Failed to check availability. Please try again.', 500);
  }
}

/**
 * Generate available time slots based on existing bookings
 */
function generateAvailableTimeSlots(
  existingBookings: any[],
  durationHours: number,
  bufferMinutes: number,
  maxConcurrent: number
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];

  // Business hours: 9 AM to 6 PM (last start time allows for 8-hour tour)
  const businessStart = 9; // 9:00 AM
  const businessEnd = 18; // 6:00 PM

  // Generate potential slots every hour
  for (let hour = businessStart; hour <= businessEnd - durationHours; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = hour + durationHours;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    // Check if this slot conflicts with existing bookings
    const hasConflict = checkTimeSlotConflict(
      startTime,
      endTime,
      existingBookings,
      bufferMinutes,
      maxConcurrent
    );

    if (!hasConflict) {
      slots.push({ start: startTime, end: endTime });
    }
  }

  return slots;
}

/**
 * Check if a time slot conflicts with existing bookings
 */
function checkTimeSlotConflict(
  startTime: string,
  endTime: string,
  existingBookings: any[],
  bufferMinutes: number,
  maxConcurrent: number
): boolean {
  const slotStart = timeToMinutes(startTime);
  const slotEnd = timeToMinutes(endTime);

  let concurrentCount = 0;

  for (const booking of existingBookings) {
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);

    // Add buffer time to booking
    const bufferedStart = bookingStart - bufferMinutes;
    const bufferedEnd = bookingEnd + bufferMinutes;

    // Check for overlap
    if (slotStart < bufferedEnd && slotEnd > bufferedStart) {
      concurrentCount++;

      // If we exceed max concurrent bookings, this slot is unavailable
      if (concurrentCount >= maxConcurrent) {
        return true;
      }
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
 * Calculate pricing for booking
 */
async function calculatePricing(
  date: string,
  durationHours: number,
  vehicleType: string
): Promise<{
  base_price: number;
  estimated_gratuity: number;
  taxes: number;
  total: number;
  deposit_required: number;
}> {
  // Determine if weekend
  const tourDate = new Date(date);
  const dayOfWeek = tourDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

  // Get pricing rule from database
  const pricingResult = await query(
    `SELECT base_price, weekend_multiplier
     FROM pricing_rules
     WHERE vehicle_type = $1
     AND duration_hours = $2
     AND (is_weekend = $3 OR is_weekend IS NULL)
     AND is_active = true
     ORDER BY priority DESC, is_weekend DESC
     LIMIT 1`,
    [vehicleType, durationHours, isWeekend]
  );

  let basePrice = 0;

  if (pricingResult.rows.length > 0) {
    const rule = pricingResult.rows[0];
    basePrice = parseFloat(rule.base_price);

    // Apply weekend multiplier if applicable
    if (isWeekend && rule.weekend_multiplier) {
      basePrice *= parseFloat(rule.weekend_multiplier);
    }
  } else {
    // Fallback pricing if no rule found
    const basePrices: Record<number, number> = {
      4.0: isWeekend ? 720 : 600,
      6.0: isWeekend ? 960 : 800,
      8.0: isWeekend ? 1200 : 1000
    };
    basePrice = basePrices[durationHours] || 800;
  }

  // Calculate additional charges
  const estimatedGratuity = basePrice * 0.15; // 15% suggested gratuity
  const taxes = basePrice * 0.09; // 9% estimated tax
  const total = basePrice + estimatedGratuity + taxes;
  const depositRequired = total * 0.5; // 50% deposit

  return {
    base_price: Math.round(basePrice * 100) / 100,
    estimated_gratuity: Math.round(estimatedGratuity * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    total: Math.round(total * 100) / 100,
    deposit_required: Math.round(depositRequired * 100) / 100
  };
}
