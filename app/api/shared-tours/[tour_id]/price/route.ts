import { NextRequest, NextResponse } from 'next/server';
import { sharedTourService } from '@/lib/services/shared-tour.service';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

/**
 * GET /api/shared-tours/[tour_id]/price
 * Calculate price for tickets
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tour_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const ticketCount = parseInt(searchParams.get('tickets') || '1');
    const includesLunch = searchParams.get('lunch') !== 'false';

    const pricing = await sharedTourService.calculatePrice(tour_id, ticketCount, includesLunch);

    return NextResponse.json({
      success: true,
      data: pricing,
    });
  } catch (error: any) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
