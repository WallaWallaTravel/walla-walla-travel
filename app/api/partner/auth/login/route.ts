import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * POST /api/partner/auth/login
 * Authenticate hotel partner
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.email || !body.password) {
    throw new BadRequestError('Email and password are required');
  }

  const hotel = await hotelPartnerService.authenticateHotel(body.email, body.password);

  if (!hotel) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Return hotel info - client stores this for subsequent requests
  return NextResponse.json({
    success: true,
    data: {
      id: hotel.id,
      name: hotel.name,
      contact_name: hotel.contact_name,
      email: hotel.email,
    },
  });
});
