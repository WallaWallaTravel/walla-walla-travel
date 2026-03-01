import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { updateEventSchema } from '@/lib/validation/schemas/events';

// ============================================================================
// GET /api/admin/events/[id] - Get a single event
// ============================================================================

export const GET = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
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

export const PUT = withAdminAuth(
  async (request: NextRequest, _session, context) => {
    const { id } = await context!.params;
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

export const DELETE = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    await eventsService.deleteEvent(Number(id));

    return NextResponse.json({
      success: true,
      message: 'Event deleted',
    });
  }
);
