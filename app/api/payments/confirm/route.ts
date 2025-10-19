import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/payments/confirm
 *
 * Confirm a payment after Stripe payment intent succeeds.
 * This endpoint is called from the frontend after Stripe confirms the payment.
 * It updates the booking and payment records in the database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_intent_id } = body;

    if (!payment_intent_id) {
      return errorResponse('Missing required field: payment_intent_id', 400);
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (!paymentIntent) {
      return errorResponse('Payment intent not found', 404);
    }

    // Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      return errorResponse(
        `Payment not successful. Status: ${paymentIntent.status}`,
        400
      );
    }

    // Get payment intent from database
    const paymentIntentResult = await query(
      `SELECT * FROM payment_intents WHERE stripe_payment_intent_id = $1`,
      [payment_intent_id]
    );

    if (paymentIntentResult.rows.length === 0) {
      return errorResponse('Payment intent record not found in database', 404);
    }

    const paymentIntentRecord = paymentIntentResult.rows[0];
    const bookingId = paymentIntentRecord.booking_id;
    const paymentType = paymentIntentRecord.metadata?.payment_type || 'deposit';

    // Get booking details
    const bookingResult = await query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse('Booking not found', 404);
    }

    const booking = bookingResult.rows[0];

    // Start transaction
    await query('BEGIN', []);

    try {
      // Update payment intent status
      await query(
        `UPDATE payment_intents
         SET status = $1, updated_at = NOW()
         WHERE stripe_payment_intent_id = $2`,
        [paymentIntent.status, payment_intent_id]
      );

      // Create payment record
      await query(
        `INSERT INTO payments (
          booking_id,
          customer_id,
          amount,
          currency,
          payment_type,
          payment_method,
          stripe_payment_intent_id,
          stripe_charge_id,
          status,
          created_at,
          updated_at,
          succeeded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())`,
        [
          bookingId,
          booking.customer_id,
          paymentIntentRecord.amount,
          'USD',
          paymentType,
          'card',
          payment_intent_id,
          paymentIntent.latest_charge,
          'succeeded',
        ]
      );

      // Update booking based on payment type
      if (paymentType === 'deposit') {
        await query(
          `UPDATE bookings
           SET deposit_paid = true,
               deposit_paid_at = NOW(),
               status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
               updated_at = NOW()
           WHERE id = $1`,
          [bookingId]
        );
      } else if (paymentType === 'final') {
        await query(
          `UPDATE bookings
           SET final_payment_paid = true,
               final_payment_paid_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [bookingId]
        );
      }

      // Create booking timeline event
      await query(
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
            amount: paymentIntentRecord.amount,
            payment_type: paymentType,
          }),
        ]
      );

      // Commit transaction
      await query('COMMIT', []);

      return successResponse({
        booking_number: booking.booking_number,
        payment_intent_id: payment_intent_id,
        amount: parseFloat(paymentIntentRecord.amount),
        payment_type: paymentType,
        status: 'succeeded',
        deposit_paid: paymentType === 'deposit' ? true : booking.deposit_paid,
        final_payment_paid: paymentType === 'final' ? true : booking.final_payment_paid,
      }, 'Payment confirmed successfully');

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK', []);
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Confirm payment error:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return errorResponse(`Stripe error: ${error.message}`, 400);
    }

    return errorResponse('Failed to confirm payment. Please contact support.', 500);
  }
}
