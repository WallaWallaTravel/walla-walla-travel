import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sharedTourService } from '@/lib/services/shared-tour.service';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

/**
 * GET /api/shared-tours/[tour_id]
 * Get a single tour with availability info
 * Public endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tour_id } = await params;
    const tour = await sharedTourService.getTourWithAvailability(tour_id);

    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Only return if published
    if (!tour.is_published) {
      return NextResponse.json(
        { success: false, error: 'Tour not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tour,
    });
  } catch (error) {
    logger.error('Error fetching tour', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
