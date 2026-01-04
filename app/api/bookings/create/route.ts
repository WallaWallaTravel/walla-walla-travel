import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { bookingService } from '@/lib/services/booking.service';
import { validate, createBookingSchema } from '@/lib/validation';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * POST /api/bookings/create
 *
 * Create a new booking with payment processing.
 * 
 * ✅ REFACTORED: Service layer handles all business logic
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withErrorHandling(async (request: NextRequest) => {
  // ✅ Validate request body
  const validation = await validate(request, createBookingSchema);
  if (!validation.success) {
    return validation.error;
  }

  const { customer, booking, wineries, payment, marketing_consent } = validation.data;

  // ✅ Use service layer for all business logic
  const result = await bookingService.createFullBooking({
    customer,
    booking,
    wineries,
    payment,
    marketing_consent,
  });

  // ✅ Return standardized success response
  return NextResponse.json({
    success: true,
    data: result,
    message: "Booking confirmed! We're excited to show you Walla Walla wine country.",
    timestamp: new Date().toISOString(),
  });
})));
