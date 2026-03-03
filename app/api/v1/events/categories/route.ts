/**
 * API v1 - Event Categories
 * GET /api/v1/events/categories - Get all active event categories
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { withRedisCache } from '@/lib/api/middleware/redis-cache';

export const GET = withErrorHandling(async () => {
  const data = await withRedisCache('events:categories', 180, async () => {
    const categories = await eventsService.getCategories();
    return { success: true, data: categories };
  });

  return NextResponse.json(data);
});
