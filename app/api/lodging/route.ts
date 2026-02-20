import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { lodgingService } from '@/lib/services/lodging.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FiltersSchema = z.object({
  property_type: z.enum(['hotel', 'str', 'bnb', 'vacation_rental', 'boutique_hotel', 'resort']).optional(),
  search: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().positive().optional(),
  max_guests: z.coerce.number().int().positive().optional(),
  pet_friendly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/lodging
 * Public listing of active lodging properties
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;

  const rawFilters: Record<string, string | undefined> = {
    property_type: searchParams.get('property_type') || undefined,
    search: searchParams.get('search') || undefined,
    min_price: searchParams.get('min_price') || undefined,
    max_price: searchParams.get('max_price') || undefined,
    bedrooms: searchParams.get('bedrooms') || undefined,
    max_guests: searchParams.get('max_guests') || undefined,
    pet_friendly: searchParams.get('pet_friendly') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  };

  const parseResult = FiltersSchema.safeParse(rawFilters);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid query parameters',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const filters = parseResult.data;

  const properties = await lodgingService.getAll({
    propertyType: filters.property_type,
    search: filters.search,
    minPrice: filters.min_price,
    maxPrice: filters.max_price,
    bedrooms: filters.bedrooms,
    maxGuests: filters.max_guests,
    petFriendly: filters.pet_friendly === 'true',
    limit: filters.limit,
    offset: filters.offset,
  });

  const count = await lodgingService.getCount({
    propertyType: filters.property_type,
  });

  return NextResponse.json({
    success: true,
    data: {
      properties,
      count,
    },
    timestamp: new Date().toISOString(),
  });
});
