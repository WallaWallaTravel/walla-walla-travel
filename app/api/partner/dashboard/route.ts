import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

interface DashboardResponse {
  success: boolean;
  profile: unknown;
  stats: unknown;
  data?: unknown;
}

/**
 * GET /api/partner/dashboard
 * Get partner dashboard data
 * Supports both JWT session (business partners) and hotel ID header (hotel partners)
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse<DashboardResponse>> => {
  // 1. Try JWT session first (business partners)
  const session = await getSessionFromRequest(request);

  if (session) {
    const role = session.user.role as string;
    if (role === 'partner' || role === 'admin') {
      const dashboard = await partnerService.getDashboardData(session.user.id);

      // Return profile and stats at root level (matches what dashboard page expects)
      return NextResponse.json({
        success: true,
        profile: dashboard.profile,
        stats: dashboard.stats,
      });
    }
  }

  // 2. Fall back to hotel ID header (hotel partners)
  const hotelId = request.headers.get('x-hotel-id');

  if (!hotelId) {
    throw new UnauthorizedError('Authentication required');
  }

  const hotelDashboard = await hotelPartnerService.getHotelDashboard(hotelId);

  return NextResponse.json({
    success: true,
    profile: null,
    stats: null,
    data: hotelDashboard,
  });
});
