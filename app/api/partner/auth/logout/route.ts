import { NextResponse } from 'next/server';
import { clearHotelSession } from '@/lib/auth/hotel-session';

/**
 * POST /api/partner/auth/logout
 * Clear hotel partner session cookie
 */
export async function POST() {
  await clearHotelSession();
  return NextResponse.json({ success: true });
}
