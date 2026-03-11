import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  shareCode: string;
  guestId: string;
}

// ============================================================================
// DELETE /api/trips/[shareCode]/guests/[guestId] - Remove a guest from the trip
// ============================================================================

export const DELETE = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode, guestId } = await context.params;
    const guestIdNum = parseInt(guestId, 10);

    if (isNaN(guestIdNum)) {
      throw new NotFoundError('Invalid guest ID');
    }

    // Get trip ID from share code
    const tripRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM trips WHERE share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripRows[0].id;

    // Get guest name for activity log
    const guestRows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM trip_guests WHERE id = ${guestIdNum} AND trip_id = ${tripId}
    `;

    if (guestRows.length === 0) {
      throw new NotFoundError('Guest not found');
    }

    const guestName = guestRows[0].name;

    // Delete the guest
    await prisma.$executeRaw`
      DELETE FROM trip_guests WHERE id = ${guestIdNum} AND trip_id = ${tripId}
    `;

    // Update confirmed guests count and trip activity
    await prisma.$executeRaw`
      UPDATE trips
       SET confirmed_guests = (
         SELECT COUNT(*) FROM trip_guests WHERE trip_id = ${tripId} AND rsvp_status = 'attending'
       ),
       last_activity_at = NOW()
       WHERE id = ${tripId}
    `;

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES (${tripId}, 'guest_removed', ${`Removed guest: ${guestName}`}, 'owner')
    `;

    return NextResponse.json({
      success: true,
      message: 'Guest removed successfully',
    });
  }
);
