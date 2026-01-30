import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext, NotFoundError } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * GET /api/shared-tours/[tour_id]
 * Get a single tour with availability info
 * Public endpoint
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: RouteContext<{ tour_id: string }>
) => {
  const { tour_id } = await params;
  const tour = await sharedTourService.getTourWithAvailability(tour_id);

  if (!tour) {
    throw new NotFoundError('Tour not found');
  }

  // Only return if published
  if (!tour.is_published) {
    throw new NotFoundError('Tour not available');
  }

  return NextResponse.json({
    success: true,
    data: tour,
  });
});
