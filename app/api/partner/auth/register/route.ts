import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * POST /api/partner/auth/register
 * Complete hotel partner registration via invite token
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate required fields
  const required = ['token', 'password', 'contact_name'];
  for (const field of required) {
    if (!body[field]) {
      throw new BadRequestError(`Missing required field: ${field}`);
    }
  }

  // Validate password strength
  if (body.password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  // Register the hotel
  const hotel = await hotelPartnerService.registerHotel(body.token, {
    password: body.password,
    contact_name: body.contact_name,
    phone: body.phone,
  });

  if (!hotel) {
    throw new NotFoundError('Invalid or expired invitation token');
  }

  return NextResponse.json({
    success: true,
    data: {
      id: hotel.id,
      name: hotel.name,
      contact_name: hotel.contact_name,
      email: hotel.email,
    },
    message: 'Registration complete. You can now log in.',
  });
});

/**
 * GET /api/partner/auth/register?token=xxx
 * Validate invite token and get hotel info for registration form
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    throw new BadRequestError('Invitation token is required');
  }

  const hotel = await hotelPartnerService.getHotelByInviteToken(token);

  if (!hotel) {
    throw new NotFoundError('Invalid or expired invitation token');
  }

  // Check if already registered
  if (hotel.registered_at) {
    throw new BadRequestError('This invitation has already been used. Please log in instead.');
  }

  return NextResponse.json({
    success: true,
    data: {
      name: hotel.name,
      email: hotel.email,
    },
  });
});
