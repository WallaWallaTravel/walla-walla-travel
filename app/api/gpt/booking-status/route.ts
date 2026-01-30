/**
 * GPT Store API: Booking Status
 *
 * Allows ChatGPT to look up booking status by booking number or email
 * Returns booking details in a conversational format
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

interface BookingRow {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  tour_date: string;
  pickup_time: string | null;
  party_size: number;
  pickup_location: string | null;
  status: string;
  total_price: number | null;
  amount_paid: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  tour_type: string | null;
  special_requests: string | null;
}

interface ItineraryStopRow {
  winery_name: string;
  stop_order: number;
  arrival_time: string | null;
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const bookingNumber = searchParams.get('booking_number');
  const email = searchParams.get('email');

  // Validate at least one parameter is provided
  if (!bookingNumber && !email) {
    throw new BadRequestError(
      'Please provide either a booking number (e.g., WWT-2024-001234) or the email address used for the booking.'
    );
  }

  // Build query based on provided parameters
  let sql: string;
  let params: string[];

  if (bookingNumber) {
    sql = `
      SELECT
        b.id, b.booking_number, b.customer_name, b.customer_email, b.customer_phone,
        b.tour_date, b.pickup_time, b.party_size, b.pickup_location, b.status,
        b.total_price, b.amount_paid, b.tour_type, b.special_requests,
        u.name as driver_name, u.phone as driver_phone
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      WHERE UPPER(b.booking_number) = UPPER($1)
    `;
    params = [bookingNumber];
  } else {
    sql = `
      SELECT
        b.id, b.booking_number, b.customer_name, b.customer_email, b.customer_phone,
        b.tour_date, b.pickup_time, b.party_size, b.pickup_location, b.status,
        b.total_price, b.amount_paid, b.tour_type, b.special_requests,
        u.name as driver_name, u.phone as driver_phone
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      WHERE LOWER(b.customer_email) = LOWER($1)
      ORDER BY b.tour_date DESC
      LIMIT 1
    `;
    params = [email!];
  }

  const result = await query<BookingRow>(sql, params);

  if (result.rows.length === 0) {
    const searchType = bookingNumber ? `booking number "${bookingNumber}"` : `email "${email}"`;
    throw new NotFoundError(
      `I couldn't find a booking with ${searchType}. Please double-check the information or contact us at info@wallawalla.travel for assistance.`
    );
  }

  const booking = result.rows[0];

  // Get itinerary stops if they exist
  const stopsResult = await query<ItineraryStopRow>(
    `SELECT w.name as winery_name, s.stop_order, s.arrival_time
     FROM itinerary_stops s
     JOIN itineraries i ON s.itinerary_id = i.id
     JOIN wineries w ON s.winery_id = w.id
     WHERE i.booking_id = $1
     ORDER BY s.stop_order`,
    [booking.id]
  );

  const wineryNames = stopsResult.rows.map(s => s.winery_name);

  // Format date and time
  const tourDate = new Date(booking.tour_date);
  const formattedDate = tourDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate balance
  const totalPrice = booking.total_price || 0;
  const amountPaid = booking.amount_paid || 0;
  const balanceDue = Math.max(0, totalPrice - amountPaid);

  // Generate human-friendly status message
  let statusMessage: string;
  switch (booking.status) {
    case 'confirmed':
      statusMessage = `Your wine tour is confirmed for ${formattedDate}!`;
      if (booking.driver_name) {
        statusMessage += ` Your driver will be ${booking.driver_name}.`;
      }
      break;
    case 'pending':
      statusMessage = `Your booking for ${formattedDate} is pending confirmation. We'll send you an email once it's confirmed.`;
      break;
    case 'completed':
      statusMessage = `Your wine tour on ${formattedDate} has been completed. Thank you for touring with us!`;
      break;
    case 'cancelled':
      statusMessage = `This booking for ${formattedDate} has been cancelled.`;
      break;
    default:
      statusMessage = `Your booking is scheduled for ${formattedDate}.`;
  }

  // Add itinerary info if available
  if (wineryNames.length > 0 && booking.status !== 'cancelled') {
    statusMessage += ` You'll be visiting ${wineryNames.join(', ')}.`;
  }

  // Add pickup info
  if (booking.pickup_location && booking.pickup_time && booking.status === 'confirmed') {
    statusMessage += ` Pickup is at ${booking.pickup_time} from ${booking.pickup_location}.`;
  }

  // Add payment info
  if (balanceDue > 0 && booking.status !== 'cancelled') {
    statusMessage += ` Balance due: $${balanceDue.toFixed(2)}.`;
  }

  return NextResponse.json(
    {
      success: true,
      message: statusMessage,
      booking: {
        booking_number: booking.booking_number,
        status: booking.status,
        tour_date: booking.tour_date,
        tour_time: booking.pickup_time || 'TBD',
        party_size: booking.party_size,
        pickup_location: booking.pickup_location || 'TBD',
        wineries: wineryNames,
        driver_name: booking.driver_name || null,
        driver_phone: booking.driver_phone || null,
        total_paid: amountPaid,
        balance_due: balanceDue,
        tour_type: booking.tour_type || 'wine_tour'
      }
    },
    { headers: corsHeaders }
  );
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
