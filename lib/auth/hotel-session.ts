/**
 * Hotel Partner Session Management
 *
 * Server-side JWT session via HttpOnly cookie for hotel partners.
 * Replaces the insecure localStorage + x-hotel-id header approach.
 */

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const HOTEL_SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-me'
);

const COOKIE_NAME = 'hotel_session';

export interface HotelSession {
  hotelId: string;
  hotelName: string;
  email: string;
}

/**
 * Get hotel session from cookies (for Server Components and Route Handlers)
 */
export async function getHotelSession(): Promise<HotelSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, HOTEL_SESSION_SECRET);
    return {
      hotelId: payload.hotelId as string,
      hotelName: payload.hotelName as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get hotel session from request (for API routes that receive NextRequest)
 */
export async function getHotelSessionFromRequest(request: NextRequest): Promise<HotelSession | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, HOTEL_SESSION_SECRET);
    return {
      hotelId: payload.hotelId as string,
      hotelName: payload.hotelName as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Clear hotel session cookie
 */
export async function clearHotelSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
