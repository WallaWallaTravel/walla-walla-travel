/**
 * POST /api/webhooks/sentry
 *
 * Thin router: verify HMAC-SHA256 signature, then delegate to focused handlers.
 * Business logic lives in lib/webhooks/sentry/*.handler.ts
 *
 * Follows the Stripe webhook pattern — no CSRF, no rate limit.
 * Always returns 2xx so Sentry doesn't retry on processing errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';
import { verifySentrySignature } from '@/lib/webhooks/sentry/verify';
import { handleSentryIssueAlert } from '@/lib/webhooks/sentry/issue-alert.handler';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // ── Signature verification ──────────────────────────────────────────
  const body = await request.text();
  const signature = request.headers.get('sentry-hook-signature') || '';
  const resource = request.headers.get('sentry-hook-resource') || '';

  if (!verifySentrySignature(body, signature)) {
    logger.error('[Sentry Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── Route to handler ───────────────────────────────────────────────
  logger.info('[Sentry Webhook] Event received', { resource });

  try {
    switch (resource) {
      case 'issue': {
        const payload = JSON.parse(body);
        await handleSentryIssueAlert(payload);
        break;
      }
      default:
        logger.info('[Sentry Webhook] Unhandled resource type', { resource });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('[Sentry Webhook] Error processing event', { resource, error: err });
    // Always return 2xx — Sentry retries on non-2xx
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
});
