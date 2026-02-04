import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * POST /api/partner/shared-tours/book
 * Book a guest on behalf of the hotel
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Get hotel ID from auth header/session
  const hotelId = request.headers.get('x-hotel-id');

  if (!hotelId) {
    throw new UnauthorizedError('Hotel authentication required');
  }

  const body = await request.json();

  // Validate required fields
  const required = ['tour_id', 'customer_name', 'customer_email', 'ticket_count'];
  for (const field of required) {
    if (!body[field]) {
      throw new BadRequestError(`Missing required field: ${field}`);
    }
  }

  // Validate ticket count
  if (body.ticket_count < 1 || body.ticket_count > 14) {
    throw new BadRequestError('Ticket count must be between 1 and 14');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer_email)) {
    throw new BadRequestError('Invalid email format');
  }

  // Book the guest
  const result = await hotelPartnerService.bookGuestForHotel(hotelId, {
    tour_id: body.tour_id,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    ticket_count: body.ticket_count,
    guest_names: body.guest_names,
    includes_lunch: body.includes_lunch ?? true,
    lunch_selection: body.lunch_selection,
    dietary_restrictions: body.dietary_restrictions,
    special_requests: body.special_requests,
  });

  return NextResponse.json({
    success: true,
    data: {
      ticket: result.ticket,
      paymentUrl: result.paymentUrl,
    },
    message: 'Guest booked successfully. Payment request email sent.',
  });
});
