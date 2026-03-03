/**
 * API v1 - Event Detail
 * GET /api/v1/events/[slug] - Get a single published event by slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { withRedisCache } from '@/lib/api/middleware/redis-cache';

interface RouteParams {
  slug: string;
}

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;

    const data = await withRedisCache(`events:slug:${slug}`, 180, async () => {
      const event = await eventsService.getBySlug(slug);

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      return { success: true, data: event };
    });

    return NextResponse.json(data);
  }
);
