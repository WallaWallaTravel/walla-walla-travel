import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { sendMagicLinkSchema } from '@/lib/validation/schemas/trip';
import { sendTripMagicLink } from '@/lib/email';

// ============================================================================
// POST /api/trips/magic-link - Send magic link email to access trips
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = sendMagicLinkSchema.parse(body);

  // Find all trips for this email
  const rows = await prisma.$queryRaw<{ share_code: string; title: string; owner_name: string }[]>`
    SELECT share_code, title, owner_name
     FROM trips
     WHERE owner_email = ${validated.email}
     ORDER BY last_activity_at DESC
     LIMIT 1
  `;

  if (rows.length === 0) {
    throw new NotFoundError('No trips found for this email address');
  }

  const trip = rows[0];

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
  await prisma.$executeRaw`
    INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
     SELECT id, 'magic_link_sent', 'Magic link email sent', 'system'
     FROM trips WHERE share_code = ${trip.share_code}
  `;

  return NextResponse.json({
    success: true,
    message: 'Magic link sent! Check your email.',
  });
});
