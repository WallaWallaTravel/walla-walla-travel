/**
 * API v1 - Event Tags
 * GET /api/v1/events/tags - List all available tags
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { withRedisCache } from '@/lib/api/middleware/redis-cache';

export const GET = withErrorHandling(async () => {
  const data = await withRedisCache('events:tags', 180, async () => {
    const tags = await eventsService.getAllTags();
    return { success: true, data: tags };
  });

  return NextResponse.json(data);
});
