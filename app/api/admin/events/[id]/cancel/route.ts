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
    const event = await eventsService.cancel(Number(id));

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
);
