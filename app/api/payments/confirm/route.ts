import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withErrorHandling, BadRequestError, NotFoundError, InternalServerError } from '@/lib/api-errors';
import { queryOne, withTransaction } from '@/lib/db-helpers';
import { sendPaymentReceiptEmail } from '@/lib/services/email-automation.service';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

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
}

/**
 * POST /api/payments/confirm
 * Confirm a payment after Stripe payment intent succeeds
 * 
 * Body: {
 *   payment_intent_id: string
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check if Stripe is configured
  if (!stripe) {
    throw new InternalServerError('Payment processing not configured. Please contact support.');
  }

  const body = await request.json();
  const { payment_intent_id } = body;

  if (!payment_intent_id) {
    throw new BadRequestError('Missing required field: payment_intent_id');
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

  // Get booking details
  const booking = await queryOne<Booking>(
    `SELECT id, booking_number, customer_email, deposit_paid, final_payment_paid
     FROM bookings
     WHERE id = $1`,
    [bookingId]
  );

  if (!booking) {
    throw new NotFoundError('Booking');
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
  });

  // Send payment receipt email (async, don't wait)
  sendPaymentReceiptEmail(payment.id).catch(err => {
    console.error('[Payment] Failed to send receipt email:', err);
  });

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
});
