import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * GET /api/admin/shared-tours/available-vehicles
 * Get available vehicles for a shared tour date/time
 *
 * Query params:
 * - date: YYYY-MM-DD
 * - start_time: HH:MM:SS (optional, defaults to 10:00:00)
 * - duration_hours: number (optional, defaults to 6)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const startTime = searchParams.get('start_time') || '10:00:00';
  const durationHours = parseInt(searchParams.get('duration_hours') || '6');

  if (!date) {
    throw new BadRequestError('Date is required');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new BadRequestError('Invalid date format. Use YYYY-MM-DD');
  }

  const vehicles = await sharedTourService.getAvailableVehicles(date, startTime, durationHours);

  return NextResponse.json({
    success: true,
    data: vehicles,
    count: vehicles.length,
    available_count: vehicles.filter(v => v.available).length,
  });
});
