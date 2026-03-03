import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { clearHotelSession, getHotelSessionFromRequest } from '@/lib/auth/hotel-session';
import { logAuthEvent } from '@/lib/services/auth-audit.service';

/**
 * POST /api/partner/auth/logout
 * Clear hotel partner session cookie
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getHotelSessionFromRequest(request);

  await clearHotelSession();

  if (session) {
    logAuthEvent({
      eventType: 'logout',
      partnerType: 'hotel',
      partnerId: Number(session.hotelId),
      email: session.email,
      request,
    });
  }

  return NextResponse.json({ success: true });
});
