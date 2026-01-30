import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * GET /api/shared-tours/[tour_id]/availability
 * Check availability for a tour
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: RouteContext<{ tour_id: string }>
) => {
  const { tour_id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const ticketCount = parseInt(searchParams.get('tickets') || '1');

  const availability = await sharedTourService.checkAvailability(tour_id, ticketCount);

  return NextResponse.json({
    success: true,
    data: availability,
  });
});
