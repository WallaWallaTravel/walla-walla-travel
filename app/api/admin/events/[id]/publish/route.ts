import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { auditService } from '@/lib/services/audit.service';
import { invalidateCache } from '@/lib/api/middleware/redis-cache';

// ============================================================================
// POST /api/admin/events/[id]/publish - Publish an event
// ============================================================================

export const POST = withCSRF(
  withAdminAuth(
  async (request: NextRequest, session, context) => {
    const { id } = await context!.params;

    // Check if event is recurring — publish entire series if so
    const existing = await eventsService.getById(Number(id));
    let event;
    if (existing?.is_recurring) {
      event = await eventsService.publishRecurringSeries(Number(id));
    } else {
      event = await eventsService.publish(Number(id));
    }

    await auditService.logFromRequest(request, parseInt(session.userId), 'resource_updated', {
      entityType: 'event',
      entityId: Number(id),
      action: 'publish',
      isRecurring: existing?.is_recurring ?? false,
    });

    await invalidateCache('events:');

    return NextResponse.json({
      success: true,
      data: event,
    });
  }
)
);
