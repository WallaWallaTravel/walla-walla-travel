import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';

interface RouteParams {
  shareCode: string;
  stopId: string;
}

// ============================================================================
// DELETE /api/trips/[shareCode]/stops/[stopId] - Remove a stop from the trip
// ============================================================================

export const DELETE = withCSRF(
  withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode, stopId } = await context.params;
    const stopIdNum = parseInt(stopId, 10);

    if (isNaN(stopIdNum)) {
      throw new NotFoundError('Invalid stop ID');
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

    // Get stop name for activity log
    const stopRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT name FROM trip_stops WHERE id = $1 AND trip_id = $2`,
      stopIdNum, tripId
    );

    if (stopRows.length === 0) {
      throw new NotFoundError('Stop not found');
    }

    const stopName = stopRows[0].name;

    // Delete the stop
    await prisma.$executeRawUnsafe(
      `DELETE FROM trip_stops WHERE id = $1 AND trip_id = $2`,
      stopIdNum, tripId
    );

    // Update trip activity timestamp
    await prisma.$executeRawUnsafe(
      `UPDATE trips SET last_activity_at = NOW() WHERE id = $1`,
      tripId
    );

    // Log activity
    await prisma.$executeRawUnsafe(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES ($1, 'stop_removed', $2, 'owner')`,
      tripId, `Removed stop: ${stopName}`
    );

    return NextResponse.json({
      success: true,
      message: 'Stop removed successfully',
    });
  }
)
);
