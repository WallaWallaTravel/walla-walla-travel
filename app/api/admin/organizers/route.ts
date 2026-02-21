import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const organizers = await eventOrganizerService.getAllOrganizers();

  return NextResponse.json({ success: true, data: organizers });
});
