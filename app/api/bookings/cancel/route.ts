import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { bookingService } from '@/lib/services/booking.service';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * POST /api/bookings/cancel
 * Cancel a booking
 * 
 * ✅ REFACTORED: Service layer handles cancellation logic
 */

const CancelBookingSchema = z.object({
  booking_id: z.number().int().positive(),
  reason: z.string().optional(),
});

export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withAuth(async (request: NextRequest, _session) => {
  // ✅ Validate
  const { booking_id, reason } = await validateBody(request, CancelBookingSchema);

  // ✅ Use service layer
  const booking = await bookingService.cancel(booking_id, reason);

  return NextResponse.json({
    success: true,
    data: booking,
    message: 'Booking cancelled successfully',
    timestamp: new Date().toISOString(),
  });
})));




