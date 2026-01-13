import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';

interface RouteParams {
  shareCode: string;
  stopId: string;
}

// ============================================================================
// DELETE /api/trips/[shareCode]/stops/[stopId] - Remove a stop from the trip
// ============================================================================

export const DELETE = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode, stopId } = await context.params;
    const stopIdNum = parseInt(stopId, 10);

    if (isNaN(stopIdNum)) {
      throw new NotFoundError('Invalid stop ID');
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

    // Get stop name for activity log
    const stopResult = await query(
      `SELECT name FROM trip_stops WHERE id = $1 AND trip_id = $2`,
      [stopIdNum, tripId]
    );

    if (stopResult.rows.length === 0) {
      throw new NotFoundError('Stop not found');
    }

    const stopName = stopResult.rows[0].name;

    // Delete the stop
    await query(
      `DELETE FROM trip_stops WHERE id = $1 AND trip_id = $2`,
      [stopIdNum, tripId]
    );

    // Update trip activity timestamp
    await query(
      `UPDATE trips SET last_activity_at = NOW() WHERE id = $1`,
      [tripId]
    );

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES ($1, 'stop_removed', $2, 'owner')`,
      [tripId, `Removed stop: ${stopName}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Stop removed successfully',
    });
  }
);
