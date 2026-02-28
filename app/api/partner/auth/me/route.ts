import { NextRequest, NextResponse } from 'next/server';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/auth/me
 * Returns current hotel partner session or 401
 */
export async function GET(request: NextRequest) {
  const session = await getHotelSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: session.hotelId,
      name: session.hotelName,
      email: session.email,
    },
  });
}
