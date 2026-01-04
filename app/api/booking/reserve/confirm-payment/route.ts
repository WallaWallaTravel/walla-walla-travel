/**
 * Confirm Payment and Update Reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { confirmPaymentSuccess } from '@/lib/stripe';
import { sendReservationConfirmation } from '@/lib/email';
import { validateBody, ConfirmReservationPaymentSchema } from '@/lib/api/middleware/validation';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withErrorHandling(async (request: NextRequest) => {
  // Validate input with Zod schema
  const { paymentIntentId, reservationId } = await validateBody(request, ConfirmReservationPaymentSchema);

  // Verify payment with Stripe
  const paymentSuccessful = await confirmPaymentSuccess(paymentIntentId);

  if (!paymentSuccessful) {
    throw new BadRequestError('Payment not confirmed');
  }

  // Update reservation with payment info
  const updateResult = await query(
    `UPDATE reservations
     SET deposit_paid = true,
         payment_method = 'card',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reservationId]
  );

  if (updateResult.rows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  const reservation = updateResult.rows[0];

  // Get customer info
  const customerResult = await query(
    'SELECT * FROM customers WHERE id = $1',
    [reservation.customer_id]
  );

  const customer = customerResult.rows[0];

  // Send confirmation email with payment receipt
  if (customer) {
    await sendReservationConfirmation(
      {
        customer_name: customer.name,
        customer_email: customer.email,
        reservation_number: reservation.reservation_number,
        party_size: reservation.party_size,
        preferred_date: reservation.preferred_date,
        alternate_date: reservation.alternate_date,
        event_type: reservation.event_type || 'Wine Tour',
        special_requests: reservation.special_requests,
        deposit_amount: parseFloat(reservation.deposit_amount),
        payment_method: 'card',
        consultation_hours: 24,
        confirmation_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${reservation.id}`
      },
      customer.email,
      reservation.brand_id
    );
  }

  return NextResponse.json({
    success: true,
    reservationId: reservation.id,
    reservationNumber: reservation.reservation_number,
  });
})));
