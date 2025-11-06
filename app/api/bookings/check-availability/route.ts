import { NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api-errors';
import { checkAvailability, getAvailableDates } from '@/lib/availability-engine';
import { calculatePrice } from '@/lib/pricing-engine';

/**
 * POST /api/bookings/check-availability
 * Checks availability and returns pricing for a booking request
 * 
 * Body: {
 *   date: string (YYYY-MM-DD),
 *   duration_hours: number (4, 6, or 8),
 *   party_size: number (1-14),
 *   start_time?: string (HH:MM) - optional, checks specific time
 * }
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const { date, duration_hours, party_size, start_time } = body;

  // Validate required fields
  if (!date || !duration_hours || !party_size) {
    throw new BadRequestError('Missing required fields: date, duration_hours, and party_size are required');
  }

  // Validate duration
  if (![4, 6, 8].includes(duration_hours)) {
    throw new BadRequestError('Duration must be 4, 6, or 8 hours');
  }

  // Validate party size
  if (party_size < 1 || party_size > 14) {
    throw new BadRequestError('Party size must be between 1 and 14');
  }

  // Check availability
  const availability = await checkAvailability({
    date,
    duration_hours,
    party_size,
    start_time
  });

  // Calculate pricing
  const vehicleType = availability.suggested_vehicle?.type || 'sprinter';
  const pricing = calculatePrice({
    date,
    duration_hours,
    party_size,
    vehicle_type: vehicleType
  });

  return NextResponse.json({
    success: true,
    data: {
      available: availability.available,
      available_times: availability.available_times,
      suggested_vehicle: availability.suggested_vehicle,
      conflicts: availability.conflicts,
      pricing: {
        subtotal: pricing.subtotal,
        taxes: pricing.taxes,
        total: pricing.total,
        deposit_required: pricing.deposit_required,
        estimated_gratuity: pricing.estimated_gratuity,
        breakdown: pricing.breakdown
      }
    }
  });
});

/**
 * GET /api/bookings/check-availability?year=2025&month=11
 * Get available dates for a month
 */
export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '');
  const month = parseInt(searchParams.get('month') || '');

  if (!year || !month || month < 1 || month > 12) {
    throw new BadRequestError('Valid year and month (1-12) are required');
  }

  const availableDates = await getAvailableDates(year, month);

  return NextResponse.json({
    success: true,
    data: {
      year,
      month,
      available_dates: availableDates,
      count: availableDates.length
    }
  });
});
