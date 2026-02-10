import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { withAuth, type AuthSession, type RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { bookingService } from '@/lib/services/booking.service';

/**
 * GET /api/bookings/[bookingNumber]
 *
 * Retrieve complete booking details by booking number.
 *
 * ✅ SECURED: Requires authentication
 */
export const GET = withAuth(async (
  request: NextRequest,
  _session: AuthSession,
  context?: RouteContext,
) => {
  const params = await context!.params;
  const bookingNumber = params.bookingNumber;

  // Validate booking number format
  if (!bookingNumber || !/^WWT-\d{4}-\d{5}$/.test(bookingNumber)) {
    throw new BadRequestError('Invalid booking number format. Expected format: WWT-YYYY-NNNNN');
  }

  // Use service layer to get comprehensive booking data
  const bookingData = await bookingService.getFullBookingByNumber(bookingNumber);

  if (!bookingData) {
    throw new NotFoundError('Booking not found');
  }

  return NextResponse.json({
    success: true,
    data: bookingData,
    timestamp: new Date().toISOString(),
  });
});
