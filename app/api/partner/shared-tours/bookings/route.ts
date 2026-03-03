import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';

/**
 * GET /api/partner/shared-tours/bookings
 * Get all bookings made by the hotel
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Get hotel ID from server-side session cookie (preferred) or legacy header
  const session = await getHotelSessionFromRequest(request);
  const hotelId = session?.hotelId || request.headers.get('x-hotel-id');

  if (!hotelId) {
    throw new UnauthorizedError('Hotel authentication required');
  }

  // Verify hotel exists and is active
  const hotel = await hotelPartnerService.getHotelById(hotelId);
  if (!hotel || !hotel.is_active) {
    throw new ForbiddenError('Hotel account is deactivated');
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const paymentStatus = searchParams.get('payment_status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const result = await hotelPartnerService.getHotelBookings(hotelId, {
    status,
    paymentStatus,
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    data: result.bookings,
    total: result.total,
    limit,
    offset,
  });
});
