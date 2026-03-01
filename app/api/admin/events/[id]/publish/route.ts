import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';

// ============================================================================
// POST /api/admin/events/[id]/publish - Publish an event
// ============================================================================

export const POST = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;

    // Check if event is recurring — publish entire series if so
    const existing = await eventsService.getById(Number(id));
    let event;
    if (existing?.is_recurring) {
      event = await eventsService.publishRecurringSeries(Number(id));
    } else {
      event = await eventsService.publish(Number(id));
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
);
