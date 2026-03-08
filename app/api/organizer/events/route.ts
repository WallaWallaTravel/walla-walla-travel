import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { auth } from '@/auth';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { createEventSchema } from '@/lib/validation/schemas/events';
import { withCSRF } from '@/lib/api/middleware/csrf';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  const events = await eventOrganizerService.getOrganizerEvents(
    parseInt(session.user.id),
    status
  );

  return NextResponse.json({ success: true, data: events });
});

export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = createEventSchema.parse(body);

  const result = await eventOrganizerService.createEventAsOrganizer(
    parseInt(session.user.id),
    validated
  );

  return NextResponse.json({ success: true, data: result }, { status: 201 });
})
);
