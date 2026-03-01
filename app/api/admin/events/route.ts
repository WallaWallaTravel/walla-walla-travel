import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { createEventSchema, eventFiltersSchema } from '@/lib/validation/schemas/events';

// ============================================================================
// GET /api/admin/events - List all events (admin)
// ============================================================================

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const filters = eventFiltersSchema.parse({
    category: searchParams.get('category') || undefined,
    search: searchParams.get('search') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    isFree: searchParams.get('isFree') || undefined,
    status: searchParams.get('status') || undefined,
    isFeatured: searchParams.get('isFeatured') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  });

  const result = await eventsService.listAll(filters);

  return NextResponse.json({
    success: true,
    data: result,
  });
});

// ============================================================================
// POST /api/admin/events - Create a new event
// ============================================================================

export const POST = withAdminAuth(async (request: NextRequest, session) => {
  const body = await request.json();
  const data = createEventSchema.parse(body);

  // Handle recurring event creation
  if (data.is_recurring && data.recurrence_rule) {
    const result = await eventsService.createRecurringEvent(data, parseInt(session.userId));
    return NextResponse.json(
      { success: true, data: { event: result.parent, instanceCount: result.instanceCount } },
      { status: 201 }
    );
  }

  const event = await eventsService.create(data, parseInt(session.userId));

  return NextResponse.json(
    { success: true, data: event },
    { status: 201 }
  );
});
