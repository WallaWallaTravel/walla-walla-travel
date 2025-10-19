import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/payments/create-intent
 *
 * Create a Stripe payment intent for booking deposit or final payment.
 * This endpoint initializes the Stripe payment process and returns
 * a client secret for use with Stripe Elements on the frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_number, amount, payment_type = 'deposit' } = body;

    // Validate input
    if (!booking_number || !amount) {
      return errorResponse('Missing required fields: booking_number and amount', 400);
    }

    if (amount <= 0) {
      return errorResponse('Amount must be greater than 0', 400);
    }

    // Get booking details
    const bookingResult = await query(
      `SELECT id, booking_number, customer_email, customer_name, total_price, deposit_amount, final_payment_amount
       FROM bookings
       WHERE booking_number = $1`,
      [booking_number]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse('Booking not found', 404);
    }

    const booking = bookingResult.rows[0];

    // Validate amount matches expected payment
    const expectedAmount = payment_type === 'deposit'
      ? parseFloat(booking.deposit_amount)
      : parseFloat(booking.final_payment_amount);

    if (Math.abs(amount - expectedAmount) > 0.01) {
      return errorResponse(
        `Amount mismatch. Expected $${expectedAmount} for ${payment_type}`,
        400
      );
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        booking_id: booking.id.toString(),
        booking_number: booking.booking_number,
        payment_type: payment_type,
        customer_email: booking.customer_email,
      },
      description: `Walla Walla Travel - ${payment_type} for booking ${booking.booking_number}`,
      receipt_email: booking.customer_email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent in database
    await query(
      `INSERT INTO payment_intents (
        stripe_payment_intent_id,
        booking_id,
        amount,
        currency,
        status,
        customer_email,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        paymentIntent.id,
        booking.id,
        amount,
        'usd',
        paymentIntent.status,
        booking.customer_email,
        JSON.stringify({
          payment_type,
          booking_number: booking.booking_number,
        }),
      ]
    );

    return successResponse({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount,
      payment_type: payment_type,
      booking_number: booking.booking_number,
    }, 'Payment intent created successfully');

  } catch (error: any) {
    console.error('❌ Create payment intent error:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return errorResponse(`Stripe error: ${error.message}`, 400);
    }

    return errorResponse('Failed to create payment intent. Please try again.', 500);
  }
}
