import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { updateOrganizerProfileSchema } from '@/lib/validation/schemas/events';

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const organizer = await eventOrganizerService.getByUserId(session.user.id);

  if (!organizer) {
    return NextResponse.json(
      { success: false, error: 'Organizer profile not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: organizer });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = updateOrganizerProfileSchema.parse(body);

  const organizer = await eventOrganizerService.updateProfile(
    session.user.id,
    validated
  );

  return NextResponse.json({ success: true, data: organizer });
});
