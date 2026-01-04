import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { bookingService } from '@/lib/services/booking.service';
import { z } from 'zod';

// Query parameter schema
const BookingFiltersSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  driver_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/admin/bookings
 * Get all bookings with filters
 *
 * ✅ REFACTORED: Service layer + admin auth + Zod validation
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
  const rawFilters: Record<string, string | undefined> = {
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    status: searchParams.get('status') || undefined,
    driver_id: searchParams.get('driver_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  };

  const parseResult = BookingFiltersSchema.safeParse(rawFilters);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid query parameters',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  // Use validated filters
  const result = await bookingService.list(parseResult.data);

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

