/**
 * Resend Inbound Webhook Signature Verification
 *
 * Resend uses Svix for webhook signing. The signature is HMAC-SHA256
 * of the raw body, sent in the `webhook-signature` header.
 *
 * Pattern matches lib/webhooks/sentry/verify.ts (constant-time comparison).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Verify a Resend inbound webhook signature.
 *
 * Svix sends signatures in the format: `v1,<base64-signature>`
 * The HMAC is computed over `{msg_id}.{timestamp}.{body}` using
 * the base64-decoded signing secret.
 *
 * @param rawBody - The raw request body as a string
 * @param headers - Object with webhook-id, webhook-timestamp, webhook-signature
 * @returns true if the signature is valid
 */
export function verifyResendWebhookSignature(
  rawBody: string,
  headers: {
    'webhook-id': string | null;
    'webhook-timestamp': string | null;
    'webhook-signature': string | null;
  }
): boolean {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn('[Resend Webhook] RESEND_INBOUND_WEBHOOK_SECRET not configured — rejecting request');
    return false;
  }

  const msgId = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signature = headers['webhook-signature'];

  if (!msgId || !timestamp || !signature) {
    logger.warn('[Resend Webhook] Missing required webhook headers', {
      hasId: !!msgId,
      hasTimestamp: !!timestamp,
      hasSignature: !!signature,
    });
    return false;
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    logger.warn('[Resend Webhook] Timestamp out of tolerance', { timestamp, now });
    return false;
  }

  // Svix secret format: "whsec_<base64>" — strip prefix and decode
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64'
  );

  // Svix signature payload: "{msg_id}.{timestamp}.{body}"
  const signaturePayload = `${msgId}.${timestamp}.${rawBody}`;
  const expectedSig = createHmac('sha256', secretBytes)
    .update(signaturePayload)
    .digest('base64');

  // Signature header may contain multiple signatures: "v1,sig1 v1,sig2"
  const signatures = signature.split(' ');
  for (const sig of signatures) {
    const parts = sig.split(',');
    if (parts.length !== 2 || parts[0] !== 'v1') continue;

    const sigValue = parts[1];
    const sigBuffer = Buffer.from(sigValue);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length === expectedBuffer.length &&
        timingSafeEqual(sigBuffer, expectedBuffer)) {
      return true;
    }
  }

  logger.warn('[Resend Webhook] Signature verification failed');
  return false;
}
