import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * PUT /api/itineraries/[id]/reorder
 *
 * Reorder stops in an itinerary (for drag-and-drop)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itineraryId = params.id;
    const body = await request.json();
    const { stops } = body;

    if (!stops || !Array.isArray(stops)) {
      return errorResponse('stops array is required', 400);
    }

    // Verify itinerary exists
    const itineraryResult = await query(
      `SELECT * FROM itineraries WHERE id = $1`,
      [itineraryId]
    );

    if (itineraryResult.rows.length === 0) {
      return errorResponse('Itinerary not found', 404);
    }

    const itinerary = itineraryResult.rows[0];

    // Start transaction
    await query('BEGIN', []);

    try {
      // Update each stop's order
      const updatePromises = stops.map((stop: any) => {
        return query(
          `UPDATE itinerary_stops
           SET stop_order = $1,
               arrival_time = COALESCE($2, arrival_time),
               departure_time = COALESCE($3, departure_time),
               duration_minutes = COALESCE($4, duration_minutes),
               drive_time_to_next_minutes = COALESCE($5, drive_time_to_next_minutes)
           WHERE id = $6 AND itinerary_id = $7`,
          [
            stop.stop_order,
            stop.arrival_time,
            stop.departure_time,
            stop.duration_minutes,
            stop.drive_time_to_next_minutes,
            stop.id,
            itineraryId
          ]
        );
      });

      await Promise.all(updatePromises);

      // Recalculate total drive time
      const totalDriveTime = stops.reduce((sum: number, stop: any) => {
        return sum + (parseInt(stop.drive_time_to_next_minutes) || 0);
      }, 0);

      // Update itinerary total drive time
      await query(
        `UPDATE itineraries
         SET total_drive_time_minutes = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [totalDriveTime, itineraryId]
      );

      // Create timeline event
      await query(
        `INSERT INTO booking_timeline (
          booking_id,
          event_type,
          event_description,
          event_data,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          itinerary.booking_id,
          'itinerary_reordered',
          'Itinerary stops reordered',
          JSON.stringify({
            itinerary_id: itineraryId,
            stops_count: stops.length,
            new_total_drive_time: totalDriveTime
          })
        ]
      );

      // Commit transaction
      await query('COMMIT', []);

      // Get updated stops with winery details
      const updatedStopsResult = await query(
        `SELECT s.*, w.name as winery_name, w.address as winery_address
         FROM itinerary_stops s
         JOIN wineries w ON s.winery_id = w.id
         WHERE s.itinerary_id = $1
         ORDER BY s.stop_order ASC`,
        [itineraryId]
      );

      return successResponse(
        {
          itinerary_id: itineraryId,
          total_drive_time_minutes: totalDriveTime,
          stops: updatedStopsResult.rows
        },
        'Itinerary stops reordered successfully'
      );

    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Reorder itinerary stops error:', error);
    return errorResponse('Failed to reorder stops', 500);
  }
}
