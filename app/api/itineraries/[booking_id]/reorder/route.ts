import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';

/**
 * PUT /api/itineraries/[booking_id]/reorder
 * Reorder stops in an itinerary
 *
 * Uses withErrorHandling middleware for consistent error handling
 */
export const PUT = withErrorHandling<unknown, { booking_id: string }>(
  async (request: NextRequest, context: RouteContext<{ booking_id: string }>) => {
    const { booking_id: bookingId } = await context.params;
    const { stops } = await request.json();

    // Get itinerary ID for this booking
    const itineraryResult = await query(
      'SELECT id FROM itineraries WHERE booking_id = $1',
      [bookingId]
    );

    if (itineraryResult.rows.length === 0) {
      throw new NotFoundError('Itinerary not found');
    }

    const itineraryId = itineraryResult.rows[0].id;

    // Update stop orders in a transaction
    await query('BEGIN');

    try {
      for (const stop of stops) {
        await query(`
          UPDATE itinerary_stops
          SET stop_order = $1
          WHERE id = $2 AND itinerary_id = $3
        `, [stop.stop_order, stop.id, itineraryId]);
      }

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Stops reordered successfully' });
  }
);
