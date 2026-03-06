/**
 * Admin Event Analytics
 * GET /api/admin/events/[id]/analytics - Get analytics summary for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { NotFoundError } from '@/lib/api/middleware/error-handler';

export const GET = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const eventId = Number(id);

    const event = await eventsService.getById(eventId);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const analytics = await eventsService.getAnalyticsSummaryWithTopSource(eventId);

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        legacy_view_count: event.view_count,
        legacy_click_count: event.click_count,
      },
    });
  }
);
