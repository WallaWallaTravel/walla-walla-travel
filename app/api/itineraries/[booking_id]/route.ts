import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id: bookingId } = await params;

    const result = await query(`
      SELECT
        i.*,
        json_agg(
          json_build_object(
            'id', s.id,
            'stop_order', s.stop_order,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'drive_time_to_next_minutes', s.drive_time_to_next_minutes,
            'stop_type', s.stop_type,
            'reservation_confirmed', s.reservation_confirmed,
            'special_notes', s.special_notes,
            'winery', json_build_object(
              'id', w.id,
              'name', w.name,
              'slug', w.slug,
              'address', w.address,
              'city', w.city,
              'tasting_fee', w.tasting_fee,
              'average_visit_duration', w.average_visit_duration
            )
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM itineraries i
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE i.booking_id = $1
      GROUP BY i.id
    `, [bookingId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Itinerary not found for this booking'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching itinerary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id: bookingId } = await params;
    const body = await request.json();

    // First get the itinerary ID for this booking
    const itineraryResult = await query(
      'SELECT id FROM itineraries WHERE booking_id = $1',
      [bookingId]
    );

    if (itineraryResult.rows.length === 0) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
    }

    const itineraryId = itineraryResult.rows[0].id;

    const result = await query(`
      UPDATE itineraries
      SET
        pickup_location = COALESCE($1, pickup_location),
        pickup_time = COALESCE($2, pickup_time),
        dropoff_location = COALESCE($3, dropoff_location),
        estimated_dropoff_time = COALESCE($4, estimated_dropoff_time),
        internal_notes = COALESCE($5, internal_notes),
        driver_notes = COALESCE($6, driver_notes),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      body.pickup_location,
      body.pickup_time,
      body.dropoff_location,
      body.estimated_dropoff_time,
      body.internal_notes,
      body.driver_notes,
      itineraryId
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating itinerary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id: bookingId } = await params;

    await query('DELETE FROM itineraries WHERE booking_id = $1', [bookingId]);

    return NextResponse.json({ success: true, message: 'Itinerary deleted' });
  } catch (error: any) {
    console.error('Error deleting itinerary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
