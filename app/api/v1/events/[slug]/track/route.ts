/**
 * API v1 - Track Event Interaction
 * POST /api/v1/events/[slug]/track - Track view or click on an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';
import { trackEventSchema } from '@/lib/validation/schemas/events';
import { withCSRF } from '@/lib/api/middleware/csrf';

interface RouteParams {
  slug: string;
}

export const POST = withCSRF(
  withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;
    const body = await request.json();
    const { type, source } = trackEventSchema.parse(body);

    // Look up event by slug to get its ID
    const event = await eventsService.getBySlug(slug);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Capture referrer, ref query param, and request metadata
    const referrer = request.headers.get('referer') || null;
    const refParam = request.nextUrl.searchParams.get('ref') || source || null;
    const userAgent = request.headers.get('user-agent') || null;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null;

    if (type === 'view') {
      await eventsService.trackView(event.id, refParam, referrer, userAgent, ipAddress);
    } else {
      await eventsService.trackClick(event.id, refParam, referrer, userAgent, ipAddress);
    }

    return NextResponse.json({
      success: true,
    });
  }
)
);
