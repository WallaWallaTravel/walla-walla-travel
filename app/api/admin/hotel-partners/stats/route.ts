import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * GET /api/admin/hotel-partners/stats
 * Get booking statistics for all hotel partners
 */
export const GET = withErrorHandling(async () => {
  const result = await hotelPartnerService.getHotelStats();

  return NextResponse.json({
    success: true,
    data: result,
  });
});
