import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, type RouteContext } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { updateOrganizerStatusSchema } from '@/lib/validation/schemas/events';

type RouteParams = { id: string };

export const GET = withErrorHandling(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const organizer = await eventOrganizerService.getById(parseInt(id, 10));

    if (!organizer) {
      return NextResponse.json(
        { success: false, error: 'Organizer not found' },
        { status: 404 }
      );
    }

    // Also fetch organizer's events
    const { eventsService } = await import('@/lib/services/events.service');
    const eventsResult = await eventsService.listAll({
      limit: 100,
      offset: 0,
    });
    // Filter to this organizer's events
    const organizerEvents = eventsResult.data.filter(
      (e) => e.organizer_id === parseInt(id, 10)
    );

    return NextResponse.json({
      success: true,
      data: { ...organizer, events: organizerEvents },
    });
  }
);

export const PUT = withErrorHandling(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const validated = updateOrganizerStatusSchema.parse(body);

    const organizer = await eventOrganizerService.updateStatus(parseInt(id, 10), validated);

    return NextResponse.json({ success: true, data: organizer });
  }
);
