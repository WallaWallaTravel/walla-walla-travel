import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * POST /api/admin/hotel-partners/[hotel_id]/invite
 * Send or resend invitation email to hotel partner
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ hotel_id: string }> }
) => {
  const { hotel_id } = await params;

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
