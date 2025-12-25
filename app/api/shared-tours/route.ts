import { NextRequest, NextResponse } from 'next/server';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * GET /api/shared-tours
 * Get all upcoming shared tours with availability
 * Public endpoint - no auth required
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let tours;
    if (startDate && endDate) {
      tours = await sharedTourService.getToursInRange(startDate, endDate);
    } else {
      tours = await sharedTourService.getUpcomingTours();
    }

    // Filter to only published tours for public API
    const publicTours = tours.filter(t => t.is_published);

    return NextResponse.json({
      success: true,
      data: publicTours,
      count: publicTours.length,
    });
  } catch (error: any) {
    console.error('Error fetching shared tours:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
