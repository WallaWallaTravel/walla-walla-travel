import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_number, email, phone, last_name, lookup_method } = body;

    if (!last_name) {
      return NextResponse.json(
        { success: false, error: { message: 'Last name is required' } },
        { status: 400 }
      );
    }

    let result;
    const lastNamePattern = `%${last_name.trim()}%`;

    // Look up by the specified method
    if (lookup_method === 'email' && email) {
      // Look up by email
      result = await query(
        `SELECT id, booking_number, customer_name, customer_email, tour_date, status
         FROM bookings
         WHERE LOWER(customer_email) = LOWER($1)
         AND UPPER(customer_name) LIKE UPPER($2)
         ORDER BY tour_date DESC
         LIMIT 1`,
        [email.trim(), lastNamePattern]
      );
    } else if (lookup_method === 'phone' && phone) {
      // Look up by phone - strip non-digits and match last 10 digits
      const phoneDigits = phone.replace(/\D/g, '');
      const phoneLast10 = phoneDigits.slice(-10);

      result = await query(
        `SELECT id, booking_number, customer_name, customer_email, customer_phone, tour_date, status
         FROM bookings
         WHERE REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') LIKE $1
         AND UPPER(customer_name) LIKE UPPER($2)
         ORDER BY tour_date DESC
         LIMIT 1`,
        [`%${phoneLast10}`, lastNamePattern]
      );
    } else if (booking_number) {
      // Look up by booking number (original method)
      result = await query(
        `SELECT id, booking_number, customer_name, customer_email, tour_date, status
         FROM bookings
         WHERE UPPER(booking_number) = UPPER($1)
         AND UPPER(customer_name) LIKE UPPER($2)
         LIMIT 1`,
        [booking_number.trim(), lastNamePattern]
      );
    } else {
      return NextResponse.json(
        { success: false, error: { message: 'Please provide a booking number, email, or phone number' } },
        { status: 400 }
      );
    }

    if (result.rows.length === 0) {
      const lookupTypeMsg = lookup_method === 'email' ? 'email address' :
                            lookup_method === 'phone' ? 'phone number' : 'booking number';
      return NextResponse.json(
        { success: false, error: { message: `Booking not found. Please check your ${lookupTypeMsg} and last name.` } },
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
    logger.error('Client Booking Lookup error', { error });
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred while looking up your booking' } },
      { status: 500 }
    );
  }
}







