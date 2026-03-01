import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';

// ============================================================================
// POST /api/admin/events/[id]/cancel - Cancel an event
// ============================================================================

export const POST = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;

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
