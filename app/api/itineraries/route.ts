import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * POST /api/itineraries
 *
 * Create a new itinerary with stops for a booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      template_name,
      is_template = false,
      pickup_location,
      pickup_time,
      dropoff_location,
      estimated_dropoff_time,
      internal_notes,
      driver_notes,
      stops = []
    } = body;

    // Validation
    if (!booking_id) {
      return errorResponse('booking_id is required', 400);
    }

    if (!stops || stops.length === 0) {
      return errorResponse('At least one stop is required', 400);
    }

    // Verify booking exists
    const bookingResult = await query(
      `SELECT id FROM bookings WHERE id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse('Booking not found', 404);
    }

    // Calculate total drive time
    const totalDriveTime = stops.reduce((sum: number, stop: any) => {
      return sum + (parseInt(stop.drive_time_to_next_minutes) || 0);
    }, 0);

    // Start transaction
    await query('BEGIN', []);

    try {
      // Create itinerary
      const itineraryResult = await query(
        `INSERT INTO itineraries (
          booking_id,
          template_name,
          is_template,
          pickup_location,
          pickup_time,
          dropoff_location,
          estimated_dropoff_time,
          total_drive_time_minutes,
          internal_notes,
          driver_notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          booking_id,
          template_name,
          is_template,
          pickup_location,
          pickup_time,
          dropoff_location,
          estimated_dropoff_time,
          totalDriveTime,
          internal_notes,
          driver_notes
        ]
      );

      const itinerary = itineraryResult.rows[0];

      // Create stops
      const stopPromises = stops.map((stop: any, index: number) => {
        return query(
          `INSERT INTO itinerary_stops (
            itinerary_id,
            winery_id,
            stop_order,
            arrival_time,
            departure_time,
            duration_minutes,
            drive_time_to_next_minutes,
            stop_type,
            reservation_confirmed,
            special_notes,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          RETURNING *`,
          [
            itinerary.id,
            stop.winery_id,
            stop.stop_order || index + 1,
            stop.arrival_time,
            stop.departure_time,
            stop.duration_minutes || 60,
            stop.drive_time_to_next_minutes || 0,
            stop.stop_type || 'winery',
            stop.reservation_confirmed || false,
            stop.special_notes
          ]
        );
      });

      const stopsResults = await Promise.all(stopPromises);
      const createdStops = stopsResults.map(result => result.rows[0]);

      // Create booking timeline event
      await query(
        `INSERT INTO booking_timeline (
          booking_id,
          event_type,
          event_description,
          event_data,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          booking_id,
          'itinerary_created',
          'Itinerary created with ' + stops.length + ' stops',
          JSON.stringify({
            itinerary_id: itinerary.id,
            stops_count: stops.length,
            total_drive_time: totalDriveTime
          })
        ]
      );

      // Commit transaction
      await query('COMMIT', []);

      return successResponse(
        {
          itinerary: {
            ...itinerary,
            stops: createdStops
          }
        },
        'Itinerary created successfully'
      );

    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Create itinerary error:', error);
    return errorResponse('Failed to create itinerary. Please try again.', 500);
  }
}
