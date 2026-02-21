/**
 * API v1 - Events
 * GET /api/v1/events - List published events with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { eventFiltersSchema } from '@/lib/validation/schemas/events';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;

  // Parse query params into filters
  const rawFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    rawFilters[key] = value;
  }

  const filters = eventFiltersSchema.parse(rawFilters);
  const result = await eventsService.listPublished(filters);

  return NextResponse.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    },
  });
});
