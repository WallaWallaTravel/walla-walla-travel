import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';

interface RouteParams {
  shareCode: string;
  guestId: string;
}

// ============================================================================
// DELETE /api/trips/[shareCode]/guests/[guestId] - Remove a guest from the trip
// ============================================================================

export const DELETE = withCSRF(
  withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode, guestId } = await context.params;
    const guestIdNum = parseInt(guestId, 10);

    if (isNaN(guestIdNum)) {
      throw new NotFoundError('Invalid guest ID');
    }

    // Get trip ID from share code
    const tripRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT id FROM trips WHERE share_code = $1`,
      shareCode
    );

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripRows[0].id;

    // Get guest name for activity log
    const guestRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT name FROM trip_guests WHERE id = $1 AND trip_id = $2`,
      guestIdNum, tripId
    );

    if (guestRows.length === 0) {
      throw new NotFoundError('Guest not found');
    }

    const guestName = guestRows[0].name;

    // Delete the guest
    await prisma.$executeRawUnsafe(
      `DELETE FROM trip_guests WHERE id = $1 AND trip_id = $2`,
      guestIdNum, tripId
    );

    // Update confirmed guests count and trip activity
    await prisma.$executeRawUnsafe(
      `UPDATE trips
       SET confirmed_guests = (
         SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status = 'attending'
       ),
       last_activity_at = NOW()
       WHERE id = $1`,
      tripId
    );

    // Log activity
    await prisma.$executeRawUnsafe(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES ($1, 'guest_removed', $2, 'owner')`,
      tripId, `Removed guest: ${guestName}`
    );

    return NextResponse.json({
      success: true,
      message: 'Guest removed successfully',
    });
  }
)
);
