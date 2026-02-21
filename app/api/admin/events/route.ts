import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventsService } from '@/lib/services/events.service';
import { createEventSchema, eventFiltersSchema } from '@/lib/validation/schemas/events';

// ============================================================================
// GET /api/admin/events - List all events (admin)
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

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

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  const body = await request.json();
  const data = createEventSchema.parse(body);

  const event = await eventsService.create(data, session.user.id);

  return NextResponse.json(
    { success: true, data: event },
    { status: 201 }
  );
});
