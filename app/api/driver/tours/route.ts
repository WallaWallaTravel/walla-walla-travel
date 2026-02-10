import { NextRequest, NextResponse } from 'next/server';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { withDriverAuth } from '@/lib/api/middleware/auth-wrapper';
import { driverService } from '@/lib/services/driver.service';

/**
 * GET /api/driver/tours
 * Get driver's tours - either for a specific date or upcoming tours
 *
 * Query params:
 * - driver_id: Required - The driver's ID
 * - date: Optional - Specific date (YYYY-MM-DD) to fetch tours for
 * - upcoming: Optional - If "true", fetches upcoming tours instead
 * - days: Optional - Number of days ahead to look (default: 30, max: 90)
 * - limit: Optional - Max tours to return (default: 50, max: 100)
 *
 * ✅ SECURED: Requires driver or admin authentication
 */
export const GET = withDriverAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;
  const driverId = searchParams.get('driver_id');
  const date = searchParams.get('date');
  const upcoming = searchParams.get('upcoming');
  const days = searchParams.get('days');
  const limit = searchParams.get('limit');

  // ✅ Validate required params
  if (!driverId) {
    throw new BadRequestError('Missing driver_id');
  }

  let tours;

  // Check if requesting upcoming tours
  if (upcoming === 'true') {
    const daysAhead = days ? parseInt(days) : 30;
    const maxResults = limit ? parseInt(limit) : 50;
    tours = await driverService.getUpcomingTours(parseInt(driverId), daysAhead, maxResults);
  } else {
    // Require date for specific date queries
    if (!date) {
      throw new BadRequestError('Missing date parameter (or use upcoming=true for upcoming tours)');
    }
    tours = await driverService.getToursByDate(parseInt(driverId), date);
  }

  return NextResponse.json({
    success: true,
    data: { tours },
    timestamp: new Date().toISOString(),
  });
});
