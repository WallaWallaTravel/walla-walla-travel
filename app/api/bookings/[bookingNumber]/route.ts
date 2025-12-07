import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { bookingService } from '@/lib/services/booking.service';

/**
 * GET /api/bookings/[bookingNumber]
 *
 * Retrieve complete booking details by booking number.
 * 
 * ✅ REFACTORED: Service layer handles all data fetching
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) => {
  const { bookingNumber } = await context.params;

  // ✅ Validate booking number format
  if (!bookingNumber || !/^WWT-\d{4}-\d{5}$/.test(bookingNumber)) {
    throw new BadRequestError('Invalid booking number format. Expected format: WWT-YYYY-NNNNN');
  }

  // ✅ Use service layer to get comprehensive booking data
  const bookingData = await bookingService.getFullBookingByNumber(bookingNumber);

  if (!bookingData) {
    throw new NotFoundError('Booking not found');
  }

  // ✅ Return standardized response
  return NextResponse.json({
    success: true,
    data: bookingData,
    timestamp: new Date().toISOString(),
  });
});
