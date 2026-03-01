import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * GET /api/admin/hotel-partners/stats
 * Get booking statistics for all hotel partners
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const result = await hotelPartnerService.getHotelStats();

  return NextResponse.json({
    success: true,
    data: result,
  });
});
