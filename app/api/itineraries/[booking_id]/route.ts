import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * GET /api/itineraries/[booking_id]
 *
 * Retrieve itinerary with all stops for a specific booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { booking_id: string } }
) {
  try {
    const bookingId = params.booking_id;

    // Get itinerary for this booking
    const itineraryResult = await query(
      `SELECT * FROM itineraries WHERE booking_id = $1`,
      [bookingId]
    );

    if (itineraryResult.rows.length === 0) {
      return errorResponse('Itinerary not found for this booking', 404);
    }

    const itinerary = itineraryResult.rows[0];

    // Get all stops with winery details
    const stopsResult = await query(
      `SELECT
        s.*,
        w.id as winery_id,
        w.name as winery_name,
        w.address as winery_address,
        w.city as winery_city,
        w.state as winery_state,
        w.zip_code as winery_zip,
        w.phone as winery_phone,
        w.website as winery_website,
        w.tasting_fee as winery_tasting_fee,
        w.specialties as winery_specialties,
        w.description as winery_description
      FROM itinerary_stops s
      JOIN wineries w ON s.winery_id = w.id
      WHERE s.itinerary_id = $1
      ORDER BY s.stop_order ASC`,
      [itinerary.id]
    );

    // Format response
    const response = {
      id: itinerary.id,
      booking_id: itinerary.booking_id,
      template_name: itinerary.template_name,
      is_template: itinerary.is_template,
      pickup_location: itinerary.pickup_location,
      pickup_time: itinerary.pickup_time,
      dropoff_location: itinerary.dropoff_location,
      estimated_dropoff_time: itinerary.estimated_dropoff_time,
      total_drive_time_minutes: itinerary.total_drive_time_minutes,
      internal_notes: itinerary.internal_notes,
      driver_notes: itinerary.driver_notes,
      created_at: itinerary.created_at,
      updated_at: itinerary.updated_at,
      stops: stopsResult.rows.map(stop => ({
        id: stop.id,
        stop_order: stop.stop_order,
        arrival_time: stop.arrival_time,
        departure_time: stop.departure_time,
        duration_minutes: stop.duration_minutes,
        drive_time_to_next_minutes: stop.drive_time_to_next_minutes,
        stop_type: stop.stop_type,
        reservation_confirmed: stop.reservation_confirmed,
        special_notes: stop.special_notes,
        winery: {
          id: stop.winery_id,
          name: stop.winery_name,
          address: stop.winery_address,
          city: stop.winery_city,
          state: stop.winery_state,
          zip_code: stop.winery_zip,
          phone: stop.winery_phone,
          website: stop.winery_website,
          tasting_fee: parseFloat(stop.winery_tasting_fee || '0'),
          specialties: stop.winery_specialties,
          description: stop.winery_description
        }
      }))
    };

    return successResponse(response, 'Itinerary retrieved successfully');

  } catch (error: any) {
    console.error('❌ Get itinerary error:', error);
    return errorResponse('Failed to retrieve itinerary', 500);
  }
}
