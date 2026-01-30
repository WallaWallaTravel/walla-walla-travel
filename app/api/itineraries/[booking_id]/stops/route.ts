import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';

/**
 * PUT /api/itineraries/[booking_id]/stops
 * Save/update stops for an itinerary
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

    // Start transaction
    await query('BEGIN');

    try {
      // Delete all existing stops for this itinerary
      await query('DELETE FROM itinerary_stops WHERE itinerary_id = $1', [itineraryId]);

      // Insert new stops
      for (const stop of stops) {
        await query(`
          INSERT INTO itinerary_stops (
            itinerary_id,
            winery_id,
            stop_order,
            arrival_time,
            departure_time,
            duration_minutes,
            drive_time_to_next_minutes,
            stop_type,
            reservation_confirmed,
            special_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          itineraryId,
          stop.winery_id,
          stop.stop_order,
          stop.arrival_time,
          stop.departure_time,
          stop.duration_minutes,
          stop.drive_time_to_next_minutes,
          stop.stop_type || 'winery',
          stop.reservation_confirmed || false,
          stop.special_notes || ''
        ]);
      }

      // Calculate and update total drive time
      const totalDriveTime = stops.reduce((sum: number, stop: { drive_time_to_next_minutes?: number }) =>
        sum + (stop.drive_time_to_next_minutes || 0), 0
      );

      await query(`
        UPDATE itineraries
        SET total_drive_time_minutes = $1, updated_at = NOW()
        WHERE id = $2
      `, [totalDriveTime, itineraryId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Stops saved successfully',
        stops_count: stops.length,
        total_drive_time: totalDriveTime
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
);
