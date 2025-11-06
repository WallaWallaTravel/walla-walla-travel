import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driver_id');
    const date = searchParams.get('date');

    if (!driverId || !date) {
      return NextResponse.json({ error: 'Missing driver_id or date' }, { status: 400 });
    }

    // Get all tours for this driver on this date
    const result = await query(`
      SELECT
        b.id as booking_id,
        b.customer_name,
        b.tour_date,
        b.start_time as pickup_time,
        b.party_size,
        b.status,
        i.id as itinerary_id,
        i.pickup_location,
        i.dropoff_location,
        i.driver_notes,
        json_agg(
          json_build_object(
            'winery_name', w.name,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'address', w.address || ''
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM bookings b
      LEFT JOIN itineraries i ON b.id = i.booking_id
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE b.driver_id = $1 AND b.tour_date = $2
      GROUP BY b.id, i.id
      ORDER BY b.start_time ASC
    `, [driverId, date]);

    return NextResponse.json({ success: true, tours: result.rows });
  } catch (error: any) {
    console.error('Error fetching driver tours:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
