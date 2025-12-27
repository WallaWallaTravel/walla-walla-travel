import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withErrorHandling, BadRequestError, NotFoundError, InternalServerError } from '@/lib/api-errors';
import { queryOne, insertOne } from '@/lib/db-helpers';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    })
  : null;

interface Booking {
  id: number;
  booking_number: string;
  customer_email: string;
  customer_name: string;
  total_price: string;
  deposit_amount: string;
  final_payment_amount: string;
}

/**
 * POST /api/payments/create-intent
 * Create a Stripe payment intent for booking deposit or final payment
 * 
 * Body: {
 *   booking_number: string,
 *   amount: number,
 *   payment_type: 'deposit' | 'final_payment'
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check if Stripe is configured
  if (!stripe) {
    throw new InternalServerError('Payment processing not configured. Please contact support.');
  }

  const body = await request.json();
  const { booking_number, amount, payment_type = 'deposit' } = body;

  // Validate input
  if (!booking_number || !amount) {
    throw new BadRequestError('Missing required fields: booking_number and amount');
  }

  if (amount <= 0) {
    throw new BadRequestError('Amount must be greater than 0');
  }

  if (!['deposit', 'final_payment'].includes(payment_type)) {
    throw new BadRequestError('Payment type must be either "deposit" or "final_payment"');
  }

  // Get booking details
  const booking = await queryOne<Booking>(
    `SELECT id, booking_number, customer_email, customer_name, total_price, deposit_amount, final_payment_amount
     FROM bookings
     WHERE booking_number = $1`,
    [booking_number]
  );

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Validate amount matches expected payment
  const expectedAmount = payment_type === 'deposit'
    ? parseFloat(booking.deposit_amount)
    : parseFloat(booking.final_payment_amount);

  if (Math.abs(amount - expectedAmount) > 0.01) {
    throw new BadRequestError(
      `Amount mismatch. Expected $${expectedAmount.toFixed(2)} for ${payment_type}`
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
    description: `Walla Walla Travel - ${payment_type === 'deposit' ? 'Deposit' : 'Final Payment'} for booking ${booking.booking_number}`,
    receipt_email: booking.customer_email,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Store payment intent in database
  await insertOne(
    `INSERT INTO payments (
      booking_id,
      customer_id,
      amount,
      currency,
      payment_type,
      payment_method,
      stripe_payment_intent_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      $1,
      (SELECT id FROM customers WHERE email = $2 LIMIT 1),
      $3, $4, $5, 'card', $6, $7, NOW(), NOW()
    ) RETURNING id`,
    [
      booking.id,
      booking.customer_email,
      amount,
      'USD',
      payment_type,
      paymentIntent.id,
      paymentIntent.status,
    ]
  );

  return NextResponse.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount,
      payment_type: payment_type,
      booking_number: booking.booking_number,
    },
    message: 'Payment intent created successfully'
  });
});
