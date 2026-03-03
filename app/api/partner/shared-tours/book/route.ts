import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  tour_id: z.string().min(1).max(50),
  customer_name: z.string().min(1).max(255),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().max(50).optional(),
  ticket_count: z.number().int().min(1).max(14),
  guest_names: z.array(z.string().max(255)).optional(),
  includes_lunch: z.boolean().optional(),
  lunch_selection: z.string().max(500).optional(),
  dietary_restrictions: z.string().max(500).optional(),
  special_requests: z.string().max(5000).optional(),
});

/**
 * POST /api/partner/shared-tours/book
 * Book a guest on behalf of the hotel
 */
export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
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

  const body = BodySchema.parse(await request.json());

  // Validate required fields (Zod handles this now, but keeping as defense in depth)
  const required = ['tour_id', 'customer_name', 'customer_email', 'ticket_count'] as const;
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
})
);
