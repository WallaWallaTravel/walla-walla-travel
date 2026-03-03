/**
 * POST /api/webhooks/stripe
 *
 * Thin router: verify webhook signature, then delegate to focused handlers.
 * Business logic lives in lib/webhooks/stripe/*.handler.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { auditService } from '@/lib/services/audit.service';
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
} from '@/lib/webhooks/stripe/payment-intent.handler';
import {
  handleChargeRefunded,
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
  handleDisputeFundsWithdrawn,
  handleDisputeFundsReinstated,
} from '@/lib/webhooks/stripe/charge.handler';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // ── Signature verification ──────────────────────────────────────────
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  // Multi-account support: 2 brands × (test + live) = up to 4 secrets
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    process.env.STRIPE_WEBHOOK_SECRET_WWT_LIVE,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_WWT_TEST,
  ].filter(Boolean) as string[];

  if (webhookSecrets.length === 0) {
    logger.warn('[Stripe Webhook] No webhook secrets configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!signature) {
    logger.warn('[Stripe Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event | undefined;
  const stripe = getStripe();
  let lastError = '';

  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Invalid signature';
    }
  }

  if (!event) {
    logger.error('[Stripe Webhook] Signature verification failed', { error: lastError });
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  // ── Route to handler ───────────────────────────────────────────────
  logger.info('[Stripe Webhook] Event received', { type: event.type, id: event.id });

  auditService
    .logActivity({
      userId: 0,
      action: 'payment_webhook_received',
      details: { eventType: event.type, eventId: event.id },
    })
    .catch(() => {});

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object as Stripe.Dispute);
        break;
      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;
      case 'charge.dispute.funds_withdrawn':
        await handleDisputeFundsWithdrawn(event.data.object as Stripe.Dispute);
        break;
      case 'charge.dispute.funds_reinstated':
        await handleDisputeFundsReinstated(event.data.object as Stripe.Dispute);
        break;
      default:
        logger.info('[Stripe Webhook] Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('[Stripe Webhook] Error processing event', { type: event.type, error: err });
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
});
