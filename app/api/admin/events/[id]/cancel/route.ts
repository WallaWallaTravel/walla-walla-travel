import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  ForbiddenError,
  RouteContext,
} from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventsService } from '@/lib/services/events.service';

interface RouteParams {
  id: string;
}

// ============================================================================
// POST /api/admin/events/[id]/cancel - Cancel an event
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = await context.params;

    // Check if event is recurring — cancel entire series if so
    const existing = await eventsService.getById(Number(id));
    let event;
    if (existing?.is_recurring) {
      event = await eventsService.cancelRecurringSeries(Number(id));
    } else {
      event = await eventsService.cancel(Number(id));
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
);
