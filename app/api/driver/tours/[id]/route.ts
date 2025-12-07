import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { driverService } from '@/lib/services/driver.service';

/**
 * GET /api/driver/tours/[id]
 * Get a single tour's details for the driver
 * 
 * Query params:
 * - driver_id: Optional - The driver's ID (for access control)
 * 
 * ✅ New endpoint for driver tour detail page
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const bookingId = parseInt(resolvedParams.id);
  
  if (isNaN(bookingId)) {
    throw new BadRequestError('Invalid booking ID');
  }

  const searchParams = request.nextUrl.searchParams;
  const driverIdParam = searchParams.get('driver_id');
  const driverId = driverIdParam ? parseInt(driverIdParam) : undefined;

  const tour = await driverService.getTourById(bookingId, driverId);

  if (!tour) {
    throw new NotFoundError('Tour not found or you do not have access to this tour');
  }

  return NextResponse.json({
    success: true,
    tour,
    timestamp: new Date().toISOString(),
  });
});

