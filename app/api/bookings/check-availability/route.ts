import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody, validateQuery } from '@/lib/api/middleware/validation';
import { CheckAvailabilitySchema, z } from '@/lib/validation/schemas';
import { checkAvailability, getAvailableDates } from '@/lib/availability-engine';
import { calculatePrice } from '@/lib/pricing-engine';

/**
 * POST /api/bookings/check-availability
 * Checks availability and returns pricing for a booking request
 * 
 * ✅ REFACTORED: Now using Zod validation for type-safe inputs
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // ✅ Validate with Zod schema (auto type-safe!)
  const { date, duration_hours, party_size, start_time } = await validateBody(
    request,
    CheckAvailabilitySchema
  );

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
 * 
 * ✅ REFACTORED: Now using Zod validation for query parameters
 */
const GetAvailabilityQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  month: z.coerce.number().int().min(1).max(12),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  // ✅ Validate query params with Zod
  const { year, month } = validateQuery(request, GetAvailabilityQuerySchema);

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
