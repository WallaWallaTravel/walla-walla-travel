import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { withRedisCache } from '@/lib/api/middleware/redis-cache';

/**
 * GET /api/shared-tours
 * Get all upcoming shared tours with availability
 * Public endpoint - no auth required
 *
 * Uses withErrorHandling for consistent error responses
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  const cacheKey = `shared-tours:list:${searchParams.toString()}`;

  const data = await withRedisCache(cacheKey, 120, async () => {
    let tours;
    if (startDate && endDate) {
      tours = await sharedTourService.getToursInRange(startDate, endDate);
    } else {
      tours = await sharedTourService.getUpcomingTours();
    }

    // Filter to only published tours for public API
    const publicTours = tours.filter(t => t.is_published);

    return {
      success: true,
      data: publicTours,
      count: publicTours.length,
    };
  });

  return NextResponse.json(data);
});
