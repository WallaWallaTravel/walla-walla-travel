import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateQuery } from '@/lib/api/middleware/validation';
import { wineryService } from '@/lib/services/winery.service';

// ============================================================================
// Schema
// ============================================================================

const QuerySchema = z.object({
  search: z.string().optional(),
  reservation: z.enum(['true', 'false']).optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

// ============================================================================
// GET - List wineries
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const params = validateQuery(request, QuerySchema);

  const wineries = await wineryService.getAll({
    search: params.search,
    reservationRequired: params.reservation === 'true' ? true : params.reservation === 'false' ? false : undefined,
    limit: params.limit,
    offset: params.offset,
  });

  const count = await wineryService.getCount({
    reservationRequired: params.reservation === 'true' ? true : params.reservation === 'false' ? false : undefined,
  });

  return NextResponse.json({
    success: true,
    data: wineries,
    meta: {
      total: count,
      limit: params.limit,
      offset: params.offset || 0,
    },
  });
});
