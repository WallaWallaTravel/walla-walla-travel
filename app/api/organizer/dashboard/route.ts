import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { auth } from '@/auth';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';

export const GET = withErrorHandling(async () => {
  const session = await auth();
  if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const dashboard = await eventOrganizerService.getDashboard(parseInt(session.user.id));

  return NextResponse.json({ success: true, data: dashboard });
});
