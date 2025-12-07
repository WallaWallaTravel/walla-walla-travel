import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { bookingService } from '@/lib/services/booking.service';

/**
 * GET /api/admin/bookings
 * Get all bookings with filters
 * 
 * ✅ REFACTORED: Service layer + admin auth
 */
export const GET = withAdminAuth(async (request: NextRequest, session) => {
  const searchParams = request.nextUrl.searchParams;

  // ✅ Build filters
  const filters: any = {
    limit: 100,
    offset: 0,
  };

  if (searchParams.get('start_date')) {
    filters.start_date = searchParams.get('start_date');
  }
  if (searchParams.get('end_date')) {
    filters.end_date = searchParams.get('end_date');
  }
  if (searchParams.get('status')) {
    filters.status = searchParams.get('status');
  }
  if (searchParams.get('driver_id')) {
    filters.driver_id = parseInt(searchParams.get('driver_id')!);
  }

  // ✅ Use service layer
  const result = await bookingService.list(filters);

  return NextResponse.json({
    success: true,
    data: {
      bookings: result.data,
      count: result.total,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

