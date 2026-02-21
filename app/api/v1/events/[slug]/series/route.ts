/**
 * API v1 - Event Series Siblings
 * GET /api/v1/events/[slug]/series - Get sibling instances of a recurring event
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';

interface RouteParams {
  slug: string;
}

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;
    const event = await eventsService.getBySlug(slug);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const siblings = await eventsService.getSeriesSiblings(event.id);

    return NextResponse.json({
      success: true,
      data: siblings,
    });
  }
);
