import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, type RouteContext } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';

type RouteParams = { id: string };

export const POST = withErrorHandling(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    await eventOrganizerService.submitForReview(session.user.id, parseInt(id, 10));

    return NextResponse.json({
      success: true,
      data: { submitted: true },
    });
  }
);
