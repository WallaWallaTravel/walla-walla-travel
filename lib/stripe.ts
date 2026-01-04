/**
 * Stripe Configuration
 * Server-side Stripe instance with graceful degradation
 *
 * @module lib/stripe
 * @description Provides Stripe payment integration with retry logic,
 * circuit breaker support, and graceful degradation via operation queuing.
 */

import Stripe from 'stripe';
import { healthService } from '@/lib/services/health.service';
import { withGracefulDegradation, OperationType } from '@/lib/services/queue.service';
import { logger } from '@/lib/logger';

// Stripe client initialization with lazy loading
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }
  return stripe;
}

/**
 * Check if Stripe client is available
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Create a payment intent for deposit with graceful degradation
 * If Stripe is unavailable, the operation is queued for retry
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
  const result = await withGracefulDegradation(
    async () => {
      return healthService.withRetry(
        async () => {
          const client = getStripeClient();
          const paymentIntent = await client.paymentIntents.create({
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
        },
        'stripe',
        3
      );
    },
    {
      type: 'payment_create' as OperationType,
      payload: { amount, metadata },
      onQueued: (operationId) => {
        logger.info('Payment intent creation queued for retry', {
          operationId,
          amount,
          reservationId: metadata.reservationId,
        });
      },
    }
  );

  if (!result.success && result.queued) {
    // Operation was queued - throw a specific error
    const error = new Error('Payment service temporarily unavailable. Your request has been queued.');
    (error as Error & { code: string; operationId?: string }).code = 'PAYMENT_QUEUED';
    (error as Error & { operationId?: string }).operationId = result.operationId;
    throw error;
  }

  if (!result.success || !result.result) {
    throw new Error('Failed to create payment intent');
  }

  return result.result;
}

/**
 * Retrieve payment intent with retry logic
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return healthService.withRetry(
    async () => {
      const client = getStripeClient();
      return client.paymentIntents.retrieve(paymentIntentId);
    },
    'stripe',
    3
  );
}

/**
 * Confirm payment was successful with retry logic
 */
export async function confirmPaymentSuccess(paymentIntentId: string): Promise<boolean> {
  const paymentIntent = await getPaymentIntent(paymentIntentId);
  return paymentIntent.status === 'succeeded';
}

/**
 * Probe Stripe API to check availability
 * Used by health checks
 */
export async function probeStripeHealth(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();

  if (!isStripeConfigured()) {
    return { available: false, latencyMs: 0, error: 'STRIPE_SECRET_KEY not configured' };
  }

  try {
    const client = getStripeClient();
    // Use a lightweight API call to check connectivity
    await client.balance.retrieve();
    const latencyMs = Date.now() - startTime;
    return { available: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      available: false,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}


