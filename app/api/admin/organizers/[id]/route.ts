import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AuthSession, type RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { updateOrganizerStatusSchema } from '@/lib/validation/schemas/events';

export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?: RouteContext) => {
    const { id } = await context!.params;
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

export const PUT = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?: RouteContext) => {
    const { id } = await context!.params;
    const body = await request.json();
    const validated = updateOrganizerStatusSchema.parse(body);

    const organizer = await eventOrganizerService.updateStatus(parseInt(id, 10), validated);

    return NextResponse.json({ success: true, data: organizer });
  }
);
