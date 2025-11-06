import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api-errors';
import { queryOne, queryMany } from '@/lib/db-helpers';
import { sendEmail, EmailTemplates } from '@/lib/email';

/**
 * POST /api/bookings/send-confirmation
 * Send booking confirmation email to customer
 * 
 * Body: {
 *   booking_number: string
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { booking_number } = body;

  if (!booking_number) {
    throw new BadRequestError('booking_number is required');
  }

  // Get booking details
  const booking = await queryOne<{
    id: number;
    booking_number: string;
    customer_name: string;
    customer_email: string;
    tour_date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    party_size: number;
    pickup_location: string;
    total_price: string;
    deposit_amount: string;
  }>(
    `SELECT 
      id, booking_number, customer_name, customer_email, tour_date, 
      start_time, end_time, duration_hours, party_size, pickup_location,
      total_price, deposit_amount
     FROM bookings
     WHERE booking_number = $1`,
    [booking_number]
  );

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Get wineries for this booking
  const wineries = await queryMany<{ name: string; city: string }>(
    `SELECT w.name, w.city
     FROM itinerary_stops ist
     JOIN itineraries i ON ist.itinerary_id = i.id
     JOIN wineries w ON ist.winery_id = w.id
     WHERE i.booking_id = $1
     ORDER BY ist.stop_order`,
    [booking.id]
  );

  // Calculate balance
  const totalPrice = parseFloat(booking.total_price);
  const depositPaid = parseFloat(booking.deposit_amount);
  const balanceDue = totalPrice - depositPaid;

  // Send confirmation email
  const emailSent = await sendEmail({
    to: booking.customer_email,
    ...EmailTemplates.bookingConfirmation({
      customer_name: booking.customer_name,
      booking_number: booking.booking_number,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: booking.duration_hours,
      party_size: booking.party_size,
      pickup_location: booking.pickup_location,
      total_price: totalPrice,
      deposit_paid: depositPaid,
      balance_due: balanceDue,
      wineries: wineries,
    }),
  });

  return NextResponse.json({
    success: true,
    data: {
      email_sent: emailSent,
      booking_number: booking.booking_number,
      customer_email: booking.customer_email,
    },
    message: emailSent 
      ? 'Confirmation email sent successfully' 
      : 'Booking confirmed (email not configured)',
  });
});

