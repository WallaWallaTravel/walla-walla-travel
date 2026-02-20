import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateQuery } from '@/lib/api/middleware/validation';
import { ListVehiclesQuerySchema } from '@/lib/validation/schemas/vehicle.schemas';
import { vehicleService } from '@/lib/services/vehicle.service';

/**
 * GET /api/vehicles
 * Returns list of vehicles with availability status and pagination
 * Requires admin authentication.
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  // ✅ Validate query parameters with Zod
  const filters = validateQuery(request, ListVehiclesQuerySchema);

  // ✅ Use service layer for business logic
  const result = await vehicleService.list({
    available: filters.available === 'true' ? true : filters.available === 'false' ? false : undefined,
    active: filters.active === 'true' ? true : filters.active === 'false' ? false : undefined,
    capacity: filters.capacity,
    status: filters.status,
    limit: filters.limit,
    offset: filters.offset,
  });

  // ✅ Return standardized response with caching
  return NextResponse.json(
    {
      success: true,
      data: {
        vehicles: result.data,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=150',
      },
    }
  );
});
