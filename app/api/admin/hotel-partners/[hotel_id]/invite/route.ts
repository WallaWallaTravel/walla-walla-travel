import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * POST /api/admin/hotel-partners/[hotel_id]/invite
 * Send or resend invitation email to hotel partner
 */
export const POST = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { hotel_id } = await context!.params;

  const hotel = await hotelPartnerService.getHotelById(hotel_id);
  if (!hotel) {
    throw new NotFoundError('Hotel partner not found');
  }

  const sent = await hotelPartnerService.inviteHotel(hotel_id);

  return NextResponse.json({
    success: true,
    data: {
      sent,
      email: hotel.email,
    },
    message: sent
      ? 'Invitation email sent successfully'
      : 'Failed to send invitation email',
  });
});
