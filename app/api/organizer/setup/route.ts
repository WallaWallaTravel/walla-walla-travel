import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { organizerSetupSchema } from '@/lib/validation/schemas/events';
import { withCSRF } from '@/lib/api/middleware/csrf';

export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = organizerSetupSchema.parse(body);

  const result = await eventOrganizerService.completeSetup(
    validated.token,
    validated.password
  );

  return NextResponse.json({ success: true, data: result });
})
);
