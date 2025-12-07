import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_number, last_name } = body;

    if (!booking_number || !last_name) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking number and last name are required' } },
        { status: 400 }
      );
    }

    // Look up booking by number and verify last name matches
    const result = await query(
      `SELECT id, booking_number, customer_name, customer_email, tour_date, status
       FROM bookings 
       WHERE UPPER(booking_number) = UPPER($1)
       AND UPPER(customer_name) LIKE UPPER($2)
       LIMIT 1`,
      [booking_number.trim(), `%${last_name.trim()}%`]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking not found. Please check your booking number and last name.' } },
        { status: 404 }
      );
    }

    const booking = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        tour_date: booking.tour_date,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('[Client Booking Lookup] Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred while looking up your booking' } },
      { status: 500 }
    );
  }
}

