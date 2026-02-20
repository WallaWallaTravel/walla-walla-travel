import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { lodgingService, CreateLodgingSchema } from '@/lib/services/lodging.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ListFiltersSchema = z.object({
  property_type: z.enum(['hotel', 'str', 'bnb', 'vacation_rental', 'boutique_hotel', 'resort']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/admin/lodging
 * Admin listing of all lodging properties (including inactive)
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;

  const rawFilters: Record<string, string | undefined> = {
    property_type: searchParams.get('property_type') || undefined,
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  };

  const parseResult = ListFiltersSchema.safeParse(rawFilters);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid query parameters',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const filters = parseResult.data;

  const result = await lodgingService.listAll({
    propertyType: filters.property_type,
    search: filters.search,
    limit: filters.limit,
    offset: filters.offset,
  });

  // Apply status filter client-side since listAll returns all
  let properties = result.data;
  if (filters.status === 'active') {
    properties = properties.filter(p => p.is_active);
  } else if (filters.status === 'inactive') {
    properties = properties.filter(p => !p.is_active);
  }

  return NextResponse.json({
    success: true,
    data: {
      properties,
      count: properties.length,
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

/**
 * POST /api/admin/lodging
 * Create a new lodging property
 */
export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  const parseResult = CreateLodgingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 422 });
  }

  const property = await lodgingService.create(parseResult.data);

  return NextResponse.json({
    success: true,
    data: {
      property,
    },
    timestamp: new Date().toISOString(),
  }, { status: 201 });
});
