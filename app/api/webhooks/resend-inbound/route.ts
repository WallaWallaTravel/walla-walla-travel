/**
 * POST /api/webhooks/resend-inbound
 *
 * Receives inbound emails from Resend (via Svix webhook).
 * Parses the "to" address for stop-{id}@in.wallawalla.travel pattern.
 * Auto-routes matched emails to vendor_interactions; logs unmatched to inbound_email_log.
 *
 * No CSRF, no auth — webhook signature verification IS the auth.
 * Always returns 2xx so Resend doesn't retry on processing errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';
import { verifyResendWebhookSignature } from '@/lib/webhooks/resend/verify';
import { partnerRequestService } from '@/lib/services/partner-request.service';
import { prisma } from '@/lib/prisma';

interface ResendInboundPayload {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  created_at?: string;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // ── Signature verification ──────────────────────────────────────────
  const body = await request.text();
  const webhookHeaders = {
    'webhook-id': request.headers.get('webhook-id'),
    'webhook-timestamp': request.headers.get('webhook-timestamp'),
    'webhook-signature': request.headers.get('webhook-signature'),
  };

  if (!verifyResendWebhookSignature(body, webhookHeaders)) {
    logger.error('[Resend Inbound] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── Parse payload ───────────────────────────────────────────────────
  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    logger.error('[Resend Inbound] Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const fromAddress = payload.from || '';
  const toAddress = payload.to || '';
  const subject = payload.subject || null;
  const bodyText = payload.text || null;
  const bodyHtml = payload.html || null;

  logger.info('[Resend Inbound] Email received', {
    from: fromAddress,
    to: toAddress,
    subject,
  });

  try {
    // ── Try to extract stop ID from to-address ──────────────────────
    const stopId = partnerRequestService.parseReplyToAddress(toAddress);

    if (stopId) {
      // Verify stop actually exists
      const stopExists = await partnerRequestService.verifyStop(stopId);

      if (stopExists) {
        // ── Auto-route: create vendor_interaction + log ───────────
        // Sanitize body for storage (strip HTML tags, keep text)
        const content = bodyText
          || (bodyHtml ? bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '(empty)');

        const truncatedContent = content.length > 5000
          ? content.slice(0, 4997) + '...'
          : content;

        // Insert vendor interaction
        const interactionContent = `From: ${fromAddress}\nSubject: ${subject || '(no subject)'}\n\n${truncatedContent}`;
        await prisma.$executeRaw`INSERT INTO vendor_interactions (
            trip_proposal_stop_id, interaction_type, content
          ) VALUES (${stopId}, 'email_received', ${interactionContent})`;

        // Insert inbound_email_log (auto-routed)
        await prisma.$executeRaw`INSERT INTO inbound_email_log (
            from_address, to_address, subject, body_text, body_html,
            routed_to_stop_id, routing_method, routed_at
          ) VALUES (${fromAddress}, ${toAddress}, ${subject}, ${bodyText}, ${bodyHtml}, ${stopId}, 'auto_address', NOW())`;

        logger.info('[Resend Inbound] Auto-routed to stop', { stopId, from: fromAddress });
        return NextResponse.json({ received: true, routed: true, stopId });
      }
    }

    // ── Unmatched: log for admin review ─────────────────────────────
    await prisma.$executeRaw`INSERT INTO inbound_email_log (
        from_address, to_address, subject, body_text, body_html,
        routing_method
      ) VALUES (${fromAddress}, ${toAddress}, ${subject}, ${bodyText}, ${bodyHtml}, 'unmatched')`;

    logger.info('[Resend Inbound] Logged as unmatched', { from: fromAddress, to: toAddress });
    return NextResponse.json({ received: true, routed: false });

  } catch (err) {
    logger.error('[Resend Inbound] Error processing inbound email', { error: err });
    // Always return 2xx — Resend retries on non-2xx
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
});
