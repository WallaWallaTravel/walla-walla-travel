import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  ForbiddenError,
  NotFoundError,
  RouteContext,
} from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventsService } from '@/lib/services/events.service';
import { updateEventSchema } from '@/lib/validation/schemas/events';

interface RouteParams {
  id: string;
}

// ============================================================================
// GET /api/admin/events/[id] - Get a single event
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = await context.params;
    const event = await eventsService.getById(Number(id));

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
);

// ============================================================================
// PUT /api/admin/events/[id] - Update an event
// ============================================================================

export const PUT = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = await context.params;
    const body = await request.json();
    const data = updateEventSchema.parse(body);

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    // Fetch the event to check recurring status
    const existing = await eventsService.getById(Number(id));
    if (!existing) {
      throw new NotFoundError('Event not found');
    }

    let event;
    if (scope === 'series' && existing.is_recurring) {
      // Update entire recurring series
      event = await eventsService.updateRecurringSeries(Number(id), data);
    } else if (existing.parent_event_id) {
      // Update a single instance of a recurring series
      event = await eventsService.updateSingleInstance(Number(id), data);
    } else {
      // Standard update
      event = await eventsService.updateEvent(Number(id), data);
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
);

// ============================================================================
// DELETE /api/admin/events/[id] - Delete an event
// ============================================================================

export const DELETE = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = await context.params;
    await eventsService.deleteEvent(Number(id));

    return NextResponse.json({
      success: true,
      message: 'Event deleted',
    });
  }
);
