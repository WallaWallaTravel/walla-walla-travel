import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * GET /api/admin/hotel-partners/[hotel_id]
 * Get a single hotel partner
 */
export const GET = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { hotel_id } = await context!.params;

  const hotel = await hotelPartnerService.getHotelById(hotel_id);
  if (!hotel) {
    throw new NotFoundError('Hotel partner not found');
  }

  // Get stats for this hotel
  const stats = await hotelPartnerService.getHotelStats(hotel_id);

  return NextResponse.json({
    success: true,
    data: {
      ...hotel,
      stats: stats.hotels[0] || {
        total_bookings: 0,
        total_guests: 0,
        total_revenue: 0,
        pending_payments: 0,
      },
    },
  });
});

/**
 * PATCH /api/admin/hotel-partners/[hotel_id]
 * Update a hotel partner
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { hotel_id } = await context!.params;
  const body = await request.json();

  const hotel = await hotelPartnerService.updateHotel(hotel_id, body);
  if (!hotel) {
    throw new NotFoundError('Hotel partner not found');
  }

  return NextResponse.json({
    success: true,
    data: hotel,
  });
});

/**
 * DELETE /api/admin/hotel-partners/[hotel_id]
 * Deactivate a hotel partner (soft delete)
 */
export const DELETE = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { hotel_id } = await context!.params;

  const hotel = await hotelPartnerService.updateHotel(hotel_id, { is_active: false });
  if (!hotel) {
    throw new NotFoundError('Hotel partner not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Hotel partner deactivated',
  });
});
