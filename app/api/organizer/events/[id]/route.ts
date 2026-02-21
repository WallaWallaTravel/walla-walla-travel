import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, type RouteContext } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { eventsService } from '@/lib/services/events.service';
import { updateEventSchema } from '@/lib/validation/schemas/events';

type RouteParams = { id: string };

export const GET = withErrorHandling(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const eventId = parseInt(id, 10);

    const owns = await eventOrganizerService.ownsEvent(session.user.id, eventId);
    if (!owns) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    const event = await eventsService.getById(eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  }
);

export const PUT = withErrorHandling(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const eventId = parseInt(id, 10);

    const owns = await eventOrganizerService.ownsEvent(session.user.id, eventId);
    if (!owns) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    const event = await eventsService.getById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'draft' && event.status !== 'pending_review') {
      return NextResponse.json(
        { success: false, error: 'Only draft or pending events can be updated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = updateEventSchema.parse(body);

    const updated = await eventsService.updateEvent(eventId, validated);

    return NextResponse.json({ success: true, data: updated });
  }
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const eventId = parseInt(id, 10);

    const owns = await eventOrganizerService.ownsEvent(session.user.id, eventId);
    if (!owns) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    const event = await eventsService.getById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft events can be deleted' },
        { status: 400 }
      );
    }

    await eventsService.deleteEvent(eventId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  }
);
