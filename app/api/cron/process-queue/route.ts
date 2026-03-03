/**
 * Cron: Process Operation Queue
 *
 * Retries failed operations (Stripe payments, emails, webhooks) that were
 * queued by withGracefulDegradation when external services were unavailable.
 * Operations use exponential backoff and are moved to the dead-letter queue
 * after exhausting all retry attempts.
 *
 * Recommended schedule: every 5 minutes.
 * Protected by CRON_SECRET (fail-closed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';
import { withCronLock } from '@/lib/api/middleware/cron-lock';
import { queueService, type OperationType } from '@/lib/services/queue.service';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

/**
 * Handler registry — maps operation types to retry functions.
 * Each handler receives the original payload and re-executes the operation
 * directly (bypassing withGracefulDegradation to avoid re-queuing loops).
 */
function getHandler(type: OperationType): (payload: Record<string, unknown>) => Promise<void> {
  switch (type) {
    case 'payment_create':
      return async (payload) => {
        const { getStripe } = await import('@/lib/stripe');
        const stripe = getStripe();
        const amount = payload.amount as number;
        const metadata = payload.metadata as Record<string, string>;
        await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: { type: 'reservation_deposit', ...metadata },
          description: `Deposit for ${metadata.partySize} guest wine tour on ${metadata.preferredDate}`,
          receipt_email: metadata.customerEmail,
        });
      };

    case 'payment_capture':
      return async (payload) => {
        const { getStripe } = await import('@/lib/stripe');
        const stripe = getStripe();
        await stripe.paymentIntents.capture(payload.paymentIntentId as string);
      };

    case 'payment_refund':
      return async (payload) => {
        const { getStripe } = await import('@/lib/stripe');
        const stripe = getStripe();
        await stripe.refunds.create({
          payment_intent: payload.paymentIntentId as string,
          ...(payload.amount ? { amount: payload.amount as number } : {}),
        });
      };

    case 'email_send':
    case 'email_reminder':
      return async (payload) => {
        const { sendEmail } = await import('@/lib/email');
        const sent = await sendEmail(payload as unknown as Parameters<typeof sendEmail>[0]);
        if (!sent) throw new Error('sendEmail returned false');
      };

    case 'email_booking_confirmation':
      return async (payload) => {
        const { sendBookingConfirmation } = await import('@/lib/email');
        await sendBookingConfirmation(
          payload.booking as Parameters<typeof sendBookingConfirmation>[0],
          payload.customerEmail as string
        );
      };

    case 'webhook_send':
      return async (payload) => {
        const url = payload.url as string;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.body),
        });
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
      };

    case 'notification_send':
      return async () => {
        // Notification handlers (SMS/push) not yet wired up — mark as completed
        // so we don't retry indefinitely. Log for visibility.
        logger.warn('[Queue] notification_send handler not implemented, marking completed');
      };

    default: {
      const _exhaustive: never = type;
      return async () => {
        logger.error('[Queue] Unknown operation type', { type: _exhaustive });
        throw new Error(`No handler for operation type: ${type}`);
      };
    }
  }
}

export const GET = withCronAuth('process-queue', async (_request: NextRequest) => {
  return withCronLock('process-queue', async () => {
    const startTime = Date.now();
    const operations = await queueService.getPendingOperations(20);

    if (operations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending operations',
        data: { processed: 0, succeeded: 0, failed: 0 },
        timestamp: new Date().toISOString(),
      });
    }

    let succeeded = 0;
    let failed = 0;

    for (const op of operations) {
      const handler = getHandler(op.type);

      try {
        const result = await queueService.processOperation(op.id, handler);
        if (result) {
          succeeded++;
          logger.info('[Queue] Operation succeeded', {
            operationId: op.id,
            type: op.type,
            attempt: op.attempts + 1,
          });
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        logger.error('[Queue] Operation processing error', {
          operationId: op.id,
          type: op.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const stats = await queueService.getStats();
    const durationMs = Date.now() - startTime;

    logger.info('[Cron] Queue processing completed', {
      processed: operations.length,
      succeeded,
      failed,
      durationMs,
      stats,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${operations.length}: ${succeeded} succeeded, ${failed} failed`,
      data: { processed: operations.length, succeeded, failed, durationMs, stats },
      timestamp: new Date().toISOString(),
    });
  });
});

export const POST = GET;
