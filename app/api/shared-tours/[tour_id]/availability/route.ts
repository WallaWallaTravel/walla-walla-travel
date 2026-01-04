import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sharedTourService } from '@/lib/services/shared-tour.service';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

/**
 * GET /api/shared-tours/[tour_id]/availability
 * Check availability for a tour
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tour_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const ticketCount = parseInt(searchParams.get('tickets') || '1');

    const availability = await sharedTourService.checkAvailability(tour_id, ticketCount);

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    logger.error('Error checking availability', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
