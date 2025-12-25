import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

/**
 * GET /api/admin/shared-tours/[tour_id]
 * Get tour details with tickets
 */
export const GET = withAdminAuth(async (request: NextRequest, session, { params }: RouteParams) => {
  const { tour_id } = await params;

  const tour = await sharedTourService.getTourWithAvailability(tour_id);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  const tickets = await sharedTourService.getTicketsForTour(tour_id);
  const manifest = await sharedTourService.getTourManifest(tour_id);

  return NextResponse.json({
    success: true,
    data: {
      tour,
      tickets,
      manifest,
    },
  });
});

/**
 * PATCH /api/admin/shared-tours/[tour_id]
 * Update a tour
 */
export const PATCH = withAdminAuth(async (request: NextRequest, session, { params }: RouteParams) => {
  const { tour_id } = await params;
  const body = await request.json();

  // If changing date, validate day of week
  if (body.tour_date) {
    const date = new Date(body.tour_date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek > 3) {
      return NextResponse.json(
        { success: false, error: 'Shared tours can only be scheduled on Sunday through Wednesday' },
        { status: 400 }
      );
    }
  }

  const tour = await sharedTourService.updateTour(tour_id, body);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: tour,
    message: 'Tour updated successfully',
  });
});

/**
 * DELETE /api/admin/shared-tours/[tour_id]
 * Cancel a tour
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, { params }: RouteParams) => {
  const { tour_id } = await params;

  const tour = await sharedTourService.cancelTour(tour_id);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: tour,
    message: 'Tour cancelled successfully',
  });
});
