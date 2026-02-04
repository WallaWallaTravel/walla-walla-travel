import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * GET /api/partner/dashboard
 * Get hotel partner dashboard data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Get hotel ID from auth header/session
  const hotelId = request.headers.get('x-hotel-id');

  if (!hotelId) {
    throw new UnauthorizedError('Hotel authentication required');
  }

  const dashboard = await hotelPartnerService.getHotelDashboard(hotelId);

  return NextResponse.json({
    success: true,
    data: dashboard,
  });
});
