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
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { logger } from '@/lib/logger';

export const POST = withRateLimit(rateLimiters.payment)(
    withErrorHandling(async (request: NextRequest) => {
  // Validate input with Zod schema
  const { paymentIntentId, reservationId } = await validateBody(request, ConfirmReservationPaymentSchema);

  // Verify payment with Stripe
  const paymentSuccessful = await confirmPaymentSuccess(paymentIntentId);

  if (!paymentSuccessful) {
    throw new BadRequestError('Payment not confirmed');
  }

  // Update reservation with payment info
  const updateRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE reservations
    SET deposit_paid = true,
        payment_method = 'card',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${reservationId}
    RETURNING *`;

  if (updateRows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  const reservation = updateRows[0];

  // Get customer info
  const customerRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM customers WHERE id = ${reservation.customer_id}`;
  const customer = customerRows[0] ?? null;

  // Send confirmation email with payment receipt
  if (customer) {
    await sendReservationConfirmation(
      {
        customer_name: customer.name as string,
        customer_email: customer.email as string,
        reservation_number: reservation.reservation_number as string,
        party_size: reservation.party_size as number,
        preferred_date: reservation.preferred_date as string,
        alternate_date: reservation.alternate_date as string,
        event_type: (reservation.event_type as string) || 'Wine Tour',
        special_requests: reservation.special_requests as string,
        deposit_amount: parseFloat(reservation.deposit_amount as string),
        payment_method: 'card',
        consultation_hours: 24,
        confirmation_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${reservation.id}`
      },
      customer.email as string,
      reservation.brand_id as number
    );

    // Log payment to CRM (async, don't block)
    crmSyncService.logPaymentReceived(
      customer.id as number,
      parseFloat(reservation.deposit_amount as string),
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
}));
