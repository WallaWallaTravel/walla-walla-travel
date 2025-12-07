/**
 * Hotels API
 * 
 * ✅ REFACTORED: Service layer handles data fetching
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { hotelService } from '@/lib/services/hotel.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/hotels
 * Fetch all active hotels and lodging locations
 * 
 * ✅ REFACTORED: Reduced from 45 lines to 18 lines
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const hotels = await hotelService.list();

  return NextResponse.json({
    success: true,
    data: hotels,
    timestamp: new Date().toISOString(),
  });
});
