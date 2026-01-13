import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';

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
    const tripResult = await query(
      `SELECT id FROM trips WHERE share_code = $1`,
      [shareCode]
    );

    if (tripResult.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripResult.rows[0].id;

    // Get guest name for activity log
    const guestResult = await query(
      `SELECT name FROM trip_guests WHERE id = $1 AND trip_id = $2`,
      [guestIdNum, tripId]
    );

    if (guestResult.rows.length === 0) {
      throw new NotFoundError('Guest not found');
    }

    const guestName = guestResult.rows[0].name;

    // Delete the guest
    await query(
      `DELETE FROM trip_guests WHERE id = $1 AND trip_id = $2`,
      [guestIdNum, tripId]
    );

    // Update confirmed guests count and trip activity
    await query(
      `UPDATE trips
       SET confirmed_guests = (
         SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status = 'attending'
       ),
       last_activity_at = NOW()
       WHERE id = $1`,
      [tripId]
    );

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES ($1, 'guest_removed', $2, 'owner')`,
      [tripId, `Removed guest: ${guestName}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Guest removed successfully',
    });
  }
);
