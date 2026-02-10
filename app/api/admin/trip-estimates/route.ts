/**
 * Trip Estimates API Routes
 * GET /api/admin/trip-estimates - List all trip estimates
 * POST /api/admin/trip-estimates - Create a new trip estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';
import {
  CreateTripEstimateSchema,
  TRIP_ESTIMATE_STATUS,
} from '@/lib/types/trip-estimate';
import { z } from 'zod';

// Query parameter schema for listing
const ListFiltersSchema = z.object({
  status: z.enum(TRIP_ESTIMATE_STATUS).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/admin/trip-estimates
 * List trip estimates with filters
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;

  const rawFilters: Record<string, string | undefined> = {
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  };

  const parseResult = ListFiltersSchema.safeParse(rawFilters);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const result = await tripEstimateService.list(parseResult.data);

  return NextResponse.json({
    success: true,
    data: {
      estimates: result.estimates,
      total: result.total,
      limit: parseResult.data.limit,
      offset: parseResult.data.offset,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/trip-estimates
 * Create a new trip estimate
 */
export const POST = withAdminAuth(async (request: NextRequest, session) => {
  const body = await request.json();

  const parseResult = CreateTripEstimateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const estimate = await tripEstimateService.create(
    parseResult.data,
    session?.userId ? parseInt(session.userId, 10) : undefined
  );

  return NextResponse.json(
    {
      success: true,
      data: estimate,
      message: 'Trip estimate created successfully',
    },
    { status: 201 }
  );
});
