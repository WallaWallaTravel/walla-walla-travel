import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request);

  const body = await request.json();
  const {
    booking_id,
    driver_id,
    vehicle_id,
    notes,
    expires_in_hours = 48,
  } = body;

  if (!booking_id || !driver_id) {
    throw new BadRequestError('booking_id and driver_id are required');
  }

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

  // Get booking and driver details for email
  const bookingResult = await query(`
    SELECT
      b.booking_number,
      b.customer_name,
      b.tour_date,
      b.start_time,
      b.end_time,
      b.party_size,
      b.pickup_location,
      b.estimated_hours,
      b.hourly_rate,
      (b.estimated_hours * b.hourly_rate) as pay_amount
    FROM bookings b
    WHERE b.id = $1
  `, [booking_id]);

  const driverResult = await query(`
    SELECT name, email, phone FROM users WHERE id = $1
  `, [driver_id]);

  const booking = bookingResult.rows[0];
  const driver = driverResult.rows[0];

  // Create tour offer
  const result = await query(`
    INSERT INTO tour_offers (
      booking_id,
      driver_id,
      vehicle_id,
      offered_by,
      offered_at,
      expires_at,
      status,
      notes,
      created_at
    ) VALUES ($1, $2, $3, 1, NOW(), $4, 'pending', $5, NOW())
    RETURNING id
  `, [
    booking_id,
    driver_id,
    vehicle_id || null,
    expiresAt,
    notes || null,
  ]);

  const offerId = result.rows[0].id;

  // Send email notification to driver
  if (driver?.email && booking) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawallatravel.com';
    const offerUrl = `${baseUrl}/driver-portal/offers`;

    const template = EmailTemplates.tourOfferToDriver({
      driver_name: driver.name || 'Driver',
      customer_name: booking.customer_name,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time || '',
      party_size: booking.party_size,
      pickup_location: booking.pickup_location || 'TBD',
      estimated_hours: booking.estimated_hours || 4,
      pay_amount: parseFloat(booking.pay_amount) || 0,
      expires_at: expiresAt.toISOString(),
      offer_url: offerUrl,
      notes: notes || undefined,
    });

    const emailSent = await sendEmail({
      to: driver.email,
      ...template,
    });

    console.log(`📧 Tour offer #${offerId} ${emailSent ? 'email sent' : 'email failed'} to ${driver.email}`);
  }

  return NextResponse.json({
    success: true,
    offer_id: offerId,
    message: 'Tour offer created and sent to driver',
  });
});
