import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';

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
    const tripRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM trips WHERE share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripRows[0].id;

    // Get stop name for activity log
    const stopRows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM trip_stops WHERE id = ${stopIdNum} AND trip_id = ${tripId}
    `;

    if (stopRows.length === 0) {
      throw new NotFoundError('Stop not found');
    }

    const stopName = stopRows[0].name;

    // Delete the stop
    await prisma.$executeRaw`
      DELETE FROM trip_stops WHERE id = ${stopIdNum} AND trip_id = ${tripId}
    `;

    // Update trip activity timestamp
    await prisma.$executeRaw`
      UPDATE trips SET last_activity_at = NOW() WHERE id = ${tripId}
    `;

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES (${tripId}, 'stop_removed', ${`Removed stop: ${stopName}`}, 'owner')
    `;

    return NextResponse.json({
      success: true,
      message: 'Stop removed successfully',
    });
  }
);
