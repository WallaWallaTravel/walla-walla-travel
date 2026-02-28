import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const HOTEL_SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-me'
);

/**
 * POST /api/partner/auth/login
 * Authenticate hotel partner — sets HttpOnly session cookie
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

  // Create signed JWT for hotel session
  const token = await new SignJWT({
    hotelId: hotel.id,
    hotelName: hotel.name,
    email: hotel.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(HOTEL_SESSION_SECRET);

  // Set HttpOnly session cookie
  const cookieStore = await cookies();
  cookieStore.set('hotel_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  // Return hotel info for UI display (client no longer needs to store auth)
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
