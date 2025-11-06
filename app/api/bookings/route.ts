import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      // Get all bookings
      const result = await query(`
        SELECT
          id,
          customer_name,
          customer_email,
          customer_phone,
          tour_date,
          start_time as pickup_time,
          party_size,
          status,
          driver_id,
          vehicle_id,
          pickup_location,
          dropoff_location
        FROM bookings
        ORDER BY tour_date DESC, start_time ASC
      `);

      return NextResponse.json({ success: true, bookings: result.rows });
    }

    // Get bookings for specific month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const result = await query(`
      SELECT
        id,
        customer_name,
        customer_email,
        customer_phone,
        tour_date,
        start_time as pickup_time,
        party_size,
        status,
        driver_id,
        vehicle_id,
        pickup_location,
        dropoff_location
      FROM bookings
      WHERE tour_date >= $1 AND tour_date <= $2
      ORDER BY tour_date ASC, start_time ASC
    `, [startDate, endDate]);

    return NextResponse.json({ success: true, bookings: result.rows });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await query(`
      INSERT INTO bookings (
        booking_number,
        customer_name,
        customer_email,
        customer_phone,
        tour_date,
        start_time,
        end_time,
        duration_hours,
        party_size,
        pickup_location,
        dropoff_location,
        status,
        base_price,
        total_price,
        deposit_amount,
        driver_id,
        vehicle_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      `WWT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      body.customer_name,
      body.customer_email,
      body.customer_phone,
      body.tour_date,
      body.start_time || body.pickup_time,
      body.end_time || '16:00:00',
      body.duration_hours || 6,
      body.party_size,
      body.pickup_location,
      body.dropoff_location,
      body.status || 'pending',
      body.base_price || 0,
      body.total_price || 0,
      body.deposit_amount || 0,
      body.driver_id || null,
      body.vehicle_id || null
    ]);

    return NextResponse.json({ success: true, booking: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
