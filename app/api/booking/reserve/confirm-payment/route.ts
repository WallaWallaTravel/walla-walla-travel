/**
 * Confirm Payment and Update Reservation
 *
 * @deprecated LEGACY — part of the Reserve & Refine flow.
 * Modern equivalent: POST /api/bookings/create handles payment inline.
 * Still in active use by /book/reserve/payment — do NOT delete without migrating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { confirmPaymentSuccess } from '@/lib/stripe';
import { sendReservationConfirmation } from '@/lib/email';
import { validateBody, ConfirmReservationPaymentSchema } from '@/lib/api/middleware/validation';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { logger } from '@/lib/logger';

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
  const updateRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    `UPDATE reservations
     SET deposit_paid = true,
         payment_method = 'card',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    reservationId
  );

  if (updateRows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  const reservation = updateRows[0];

  // Get customer info
  const customerRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    'SELECT * FROM customers WHERE id = $1',
    reservation.customer_id
  );

  const customer = customerRows[0];

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

    // Log payment to CRM (async, don't block)
    crmSyncService.logPaymentReceived(
      customer.id,
      parseFloat(reservation.deposit_amount),
      'Deposit'
    ).catch(err => {
      logger.error('Failed to log payment to CRM', { error: err, customerId: customer.id });
    });
  }

  return NextResponse.json({
    success: true,
    reservationId: reservation.id,
    reservationNumber: reservation.reservation_number,
  });
})));
