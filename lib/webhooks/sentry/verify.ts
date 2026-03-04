/**
 * Sentry Webhook Signature Verification
 *
 * Verifies HMAC-SHA256 signatures from Sentry webhooks.
 * Pattern matches lib/api/middleware/cron-auth.ts (constant-time comparison).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Verify a Sentry webhook signature using HMAC-SHA256.
 *
 * Sentry sends the signature in the `sentry-hook-signature` header.
 * The signature is a hex-encoded HMAC-SHA256 of the raw request body,
 * using the webhook signing secret from the Internal Integration.
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The signature from the `sentry-hook-signature` header
 * @returns true if the signature is valid
 */
export function verifySentrySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn('[Sentry Webhook] SENTRY_WEBHOOK_SECRET not configured — rejecting request');
    return false;
  }

  if (!signature) {
    logger.warn('[Sentry Webhook] Missing sentry-hook-signature header');
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
