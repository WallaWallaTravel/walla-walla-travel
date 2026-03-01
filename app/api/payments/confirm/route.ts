import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { BadRequestError, NotFoundError, InternalServerError } from '@/lib/api-errors';
import { withOptionalAuth } from '@/lib/api/middleware/auth-wrapper';
import { queryOne, withTransaction } from '@/lib/db-helpers';
import { sendPaymentReceiptEmail } from '@/lib/services/email-automation.service';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { auditService } from '@/lib/services/audit.service';
import { validateBody, ConfirmPaymentSchema } from '@/lib/api/middleware/validation';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { getBrandStripeClient } from '@/lib/stripe-brands';

interface Payment {
  id: number;
  booking_id: number;
  amount: string;
  payment_type: string;
}

interface Booking {
  id: number;
  booking_number: string;
  customer_email: string;
  deposit_paid: boolean;
  final_payment_paid: boolean;
  brand_id: number | null;
}

/**
 * POST /api/payments/confirm
 * Confirm a payment after Stripe payment intent succeeds
 * 
 * Body: {
 *   payment_intent_id: string
 * }
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withOptionalAuth(async (request: NextRequest, _session) => {
  // Validate input with Zod schema
  const { payment_intent_id } = await validateBody(request, ConfirmPaymentSchema);

  // Get payment from database
  const payment = await queryOne<Payment>(
    `SELECT id, booking_id, amount, payment_type
     FROM payments
     WHERE stripe_payment_intent_id = $1`,
    [payment_intent_id]
  );

  if (!payment) {
    throw new NotFoundError('Payment record');
  }

  const bookingId = payment.booking_id;
  const paymentType = payment.payment_type;

  // Get booking details (including brand_id for brand-specific Stripe routing)
  const booking = await queryOne<Booking>(
    `SELECT id, booking_number, customer_email, deposit_paid, final_payment_paid, brand_id
     FROM bookings
     WHERE id = $1`,
    [bookingId]
  );

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Get brand-specific Stripe client
  const stripe = getBrandStripeClient(booking.brand_id ?? undefined);
  if (!stripe) {
    throw new InternalServerError('Payment processing not configured. Please contact support.');
  }

  // Retrieve payment intent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

  if (!paymentIntent) {
    throw new NotFoundError('Payment intent');
  }

  // Check if payment succeeded
  if (paymentIntent.status !== 'succeeded') {
    throw new BadRequestError(`Payment not successful. Status: ${paymentIntent.status}`);
  }

  // Update payment and booking in a transaction
  await withTransaction(async (client) => {
    // Update payment status
    await client.query(
      `UPDATE payments
       SET status = $1, succeeded_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      ['succeeded', payment.id]
    );

    // Update booking based on payment type
    if (paymentType === 'deposit') {
      await client.query(
        `UPDATE bookings
         SET deposit_paid = true,
             deposit_paid_at = NOW(),
             status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
             updated_at = NOW()
         WHERE id = $1`,
        [bookingId]
      );
    } else if (paymentType === 'final_payment') {
      await client.query(
        `UPDATE bookings
         SET final_payment_paid = true,
             final_payment_paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [bookingId]
      );
    }

    // Create booking timeline event
    await client.query(
      `INSERT INTO booking_timeline (
        booking_id,
        event_type,
        event_description,
        event_data,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        bookingId,
        'payment_received',
        `${paymentType === 'deposit' ? 'Deposit' : 'Final payment'} received`,
        JSON.stringify({
          payment_intent_id,
          amount: payment.amount,
          payment_type: paymentType,
        }),
      ]
    );

    // Create invoice record for this payment
    await client.query(
      `INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
       VALUES ($1, $2, $3, 0, $3, 'paid', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [bookingId, paymentType, parseFloat(payment.amount)]
    ).catch(() => {
      // Invoice table might not exist or have different schema
    });
  });

  // Send payment receipt email (async, don't wait)
  sendPaymentReceiptEmail(payment.id).catch(err => {
    logger.error('Payment: Failed to send receipt email', { error: err, paymentId: payment.id });
  });

  // Log payment to CRM (async, don't wait)
  // We need to get customer_id from the booking
  queryOne<{ customer_id: number }>(
    `SELECT customer_id FROM bookings WHERE id = $1`,
    [bookingId]
  ).then(bookingData => {
    if (bookingData?.customer_id) {
      crmSyncService.logPaymentReceived(
        bookingData.customer_id,
        parseFloat(payment.amount),
        paymentType,
        bookingId
      ).catch(err => {
        logger.error('Payment: Failed to log to CRM', { error: err, paymentId: payment.id });
      });
    }
  }).catch(err => {
    logger.error('Payment: Failed to get customer for CRM', { error: err, bookingId });
  });

  // Audit log: payment confirmed
  auditService.logFromRequest(request, 0, 'payment_confirmed', {
    bookingId: bookingId,
    bookingNumber: booking.booking_number,
    paymentIntentId: payment_intent_id,
    amount: parseFloat(payment.amount),
    paymentType: paymentType,
  }).catch(() => {}); // Non-blocking

  return NextResponse.json({
    success: true,
    data: {
      booking_number: booking.booking_number,
      payment_intent_id: payment_intent_id,
      amount: parseFloat(payment.amount),
      payment_type: paymentType,
      status: 'succeeded',
      deposit_paid: paymentType === 'deposit' ? true : booking.deposit_paid,
      final_payment_paid: paymentType === 'final_payment' ? true : booking.final_payment_paid,
    },
    message: 'Payment confirmed successfully'
  });
})));
