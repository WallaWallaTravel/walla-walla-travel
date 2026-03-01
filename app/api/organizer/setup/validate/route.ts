import { NextResponse, NextRequest } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';

/**
 * GET /api/organizer/setup/validate?token=...
 * Validate an organizer setup token (no auth required)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await eventOrganizerService.validateSetupToken(token);

    if (!result) {
      return NextResponse.json({ error: 'Invalid or expired setup link' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 });
  }
});
