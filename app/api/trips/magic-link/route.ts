import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { sendMagicLinkSchema } from '@/lib/validation/schemas/trip';
import { sendTripMagicLink } from '@/lib/email';

// ============================================================================
// POST /api/trips/magic-link - Send magic link email to access trips
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = sendMagicLinkSchema.parse(body);

  // Find all trips for this email
  const result = await query(
    `SELECT share_code, title, owner_name
     FROM trips
     WHERE owner_email = $1
     ORDER BY last_activity_at DESC
     LIMIT 1`,
    [validated.email]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('No trips found for this email address');
  }

  const trip = result.rows[0];

  // Send the magic link email
  const sent = await sendTripMagicLink({
    email: validated.email,
    owner_name: trip.owner_name,
    share_code: trip.share_code,
    trip_title: trip.title,
  });

  if (!sent) {
    throw new BadRequestError('Failed to send email. Please try again.');
  }

  // Log activity
  await query(
    `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
     SELECT id, 'magic_link_sent', 'Magic link email sent', 'system'
     FROM trips WHERE share_code = $1`,
    [trip.share_code]
  );

  return NextResponse.json({
    success: true,
    message: 'Magic link sent! Check your email.',
  });
});
