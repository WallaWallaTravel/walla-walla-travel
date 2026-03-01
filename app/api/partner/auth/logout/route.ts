import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { clearHotelSession } from '@/lib/auth/hotel-session';

/**
 * POST /api/partner/auth/logout
 * Clear hotel partner session cookie
 */
export const POST = withErrorHandling(async () => {
  await clearHotelSession();
  return NextResponse.json({ success: true });
});
