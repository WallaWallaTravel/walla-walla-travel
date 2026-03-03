/**
 * API v1 - Featured Events
 * GET /api/v1/events/featured - Get featured events for homepage
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { withRedisCache } from '@/lib/api/middleware/redis-cache';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 4, 1), 20) : 4;

  const data = await withRedisCache(`events:featured:${limit}`, 180, async () => {
    const events = await eventsService.getFeatured(limit);
    return { success: true, data: events };
  });

  return NextResponse.json(data);
});
