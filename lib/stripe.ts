/**
 * Stripe Configuration
 * Server-side Stripe instance
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

/**
 * Create a payment intent for deposit
 */
export async function createDepositPaymentIntent(
  amount: number, // in dollars
  metadata: {
    reservationId: string;
    customerEmail: string;
    customerName: string;
    partySize: number;
    preferredDate: string;
  }
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      type: 'reservation_deposit',
      ...metadata,
    },
    description: `Deposit for ${metadata.partySize} guest wine tour on ${metadata.preferredDate}`,
    receipt_email: metadata.customerEmail,
  });

  return paymentIntent;
}

/**
 * Retrieve payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Confirm payment was successful
 */
export async function confirmPaymentSuccess(paymentIntentId: string): Promise<boolean> {
  const paymentIntent = await getPaymentIntent(paymentIntentId);
  return paymentIntent.status === 'succeeded';
}


