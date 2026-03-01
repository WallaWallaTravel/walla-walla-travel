import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';

export const GET = withAdminAuth(async () => {
  const organizers = await eventOrganizerService.getAllOrganizers();

  return NextResponse.json({ success: true, data: organizers });
});
