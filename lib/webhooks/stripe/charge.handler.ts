/**
 * Stripe webhook handlers for charge events.
 *
 * - charge.refunded
 * - charge.dispute.created
 * - charge.dispute.updated
 * - charge.dispute.closed
 * - charge.dispute.funds_withdrawn
 * - charge.dispute.funds_reinstated
 */

import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { query, queryOne } from '@/lib/db-helpers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { findPaymentForDispute } from './utils';

/**
 * Handle charge.refunded — update payment status.
 */
export async function handleChargeRefunded(charge: Stripe.Charge) {
  const { id, payment_intent, amount_refunded } = charge;

  logger.info('[Stripe Webhook] Charge refunded', {
    chargeId: id,
    paymentIntentId: payment_intent,
    amountRefunded: amount_refunded / 100,
  });

  const paymentIntentId =
    typeof payment_intent === 'string' ? payment_intent : payment_intent?.id;

  // payments is available in Prisma
  await prisma.payments.updateMany({
    where: { stripe_payment_intent_id: paymentIntentId },
    data: { status: 'refunded', refunded_at: new Date(), updated_at: new Date() },
  });
}

/**
 * Handle charge.dispute.created — update payment, flag booking, email admin, report to Sentry.
 */
export async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const { id, charge, amount, reason, status: disputeStatus } = dispute;
  const amountDollars = amount / 100;

  logger.error('[Stripe Webhook] DISPUTE CREATED', {
    disputeId: id,
    chargeId: charge,
    amount: amountDollars,
    reason,
    disputeStatus,
  });

  Sentry.captureException(new Error(`Stripe dispute created: ${id}`), {
    level: 'error',
    tags: {
      'stripe.dispute_id': id,
      'stripe.dispute_reason': reason || 'unknown',
    },
    extra: {
      disputeId: id,
      chargeId: typeof charge === 'string' ? charge : charge?.id,
      amount: amountDollars,
      reason,
      disputeStatus,
    },
  });

  const chargeId = typeof charge === 'string' ? charge : charge?.id;
  // dispute columns (dispute_id, dispute_reason, dispute_amount) and trip_proposal_id
  // are not in Prisma payments model, so we use raw SQL for the lookup with join
  const payment = await queryOne<{
    id: number;
    booking_id: number | null;
    booking_number: string | null;
    trip_proposal_id: number | null;
    customer_email: string | null;
    amount: number;
  }>(
    `SELECT p.id, p.booking_id, p.trip_proposal_id, p.amount,
            b.booking_number, b.customer_email
     FROM payments p
     LEFT JOIN bookings b ON p.booking_id = b.id
     WHERE p.stripe_charge_id = $1 OR p.stripe_payment_intent_id = $1`,
    [chargeId]
  );

  if (payment) {
    logger.error('[Stripe Webhook] Dispute linked to payment', {
      paymentId: payment.id,
      bookingId: payment.booking_id,
      bookingNumber: payment.booking_number,
      amount: amountDollars,
      reason,
    });

    await query(
      `UPDATE payments
       SET status = 'disputed',
           dispute_id = $2,
           dispute_reason = $3,
           dispute_amount = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [payment.id, id, reason || 'unknown', amountDollars]
    ).catch((err) => {
      logger.warn('[Stripe Webhook] Could not update all dispute columns on payment', {
        paymentId: payment.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return query(
        `UPDATE payments SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      );
    });

    if (payment.booking_id) {
      // has_dispute may not be in Prisma schema — use raw SQL to be safe
      await prisma.$executeRaw`
        UPDATE bookings SET has_dispute = true, updated_at = NOW() WHERE id = ${payment.booking_id}
      `.catch((err) => {
        logger.warn('[Stripe Webhook] Could not flag booking dispute', {
          bookingId: payment.booking_id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
    const bookingRef = payment.booking_number || `Payment #${payment.id}`;
    await sendEmail({
      to: staffEmail,
      subject: `URGENT: Payment Dispute — ${bookingRef} ($${amountDollars.toFixed(2)})`,
      html: `
        <h2 style="color: #dc2626;">Payment Dispute Received</h2>
        <p>A customer has disputed a charge. <strong>You must respond within the deadline in your Stripe Dashboard.</strong></p>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Dispute ID</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Booking</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${bookingRef}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">$${amountDollars.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${reason || 'Not specified'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Customer</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${payment.customer_email || 'Unknown'}</td></tr>
        </table>
        <p style="margin-top: 16px;"><a href="https://dashboard.stripe.com/disputes/${id}" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in Stripe Dashboard</a></p>
      `,
      text: `DISPUTE: ${bookingRef} — $${amountDollars.toFixed(2)} — Reason: ${reason || 'Not specified'}. View at https://dashboard.stripe.com/disputes/${id}`,
    }).catch((err) => {
      logger.error('[Stripe Webhook] Failed to send dispute admin email', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } else {
    logger.warn('[Stripe Webhook] Dispute received but no matching payment found', {
      disputeId: id,
      chargeId,
    });
  }
}

/**
 * Handle charge.dispute.updated — reason or status changed while dispute is open.
 */
export async function handleDisputeUpdated(dispute: Stripe.Dispute) {
  const { id, reason, status: disputeStatus } = dispute;

  logger.warn('[Stripe Webhook] Dispute updated', { disputeId: id, reason, disputeStatus });

  Sentry.captureMessage(`Stripe dispute updated: ${id}`, {
    level: 'warning',
    tags: { 'stripe.dispute_id': id },
    extra: { reason, disputeStatus },
  });

  const payment = await findPaymentForDispute(dispute);
  if (!payment) return;

  await query(
    `UPDATE payments
     SET dispute_reason = COALESCE($2, dispute_reason), updated_at = NOW()
     WHERE id = $1`,
    [payment.id, reason || null]
  ).catch(() => {});
}

/**
 * Handle charge.dispute.closed — final outcome (won or lost).
 */
export async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const { id, status: disputeStatus, reason } = dispute;
  const amountDollars = dispute.amount / 100;
  const won = disputeStatus === 'won';

  logger.info('[Stripe Webhook] Dispute closed', {
    disputeId: id,
    outcome: won ? 'won' : 'lost',
    amount: amountDollars,
    reason,
  });

  Sentry.captureMessage(`Stripe dispute closed (${won ? 'won' : 'lost'}): ${id}`, {
    level: won ? 'info' : 'error',
    tags: { 'stripe.dispute_id': id, 'stripe.dispute_outcome': won ? 'won' : 'lost' },
    extra: { amount: amountDollars, reason },
  });

  const payment = await findPaymentForDispute(dispute);
  if (!payment) return;

  const newStatus = won ? 'succeeded' : 'dispute_lost';
  // Use Prisma for payment status update
  await prisma.payments.update({
    where: { id: payment.id },
    data: { status: newStatus, updated_at: new Date() },
  });

  if (payment.booking_id) {
    // has_dispute may not be in Prisma schema — use raw SQL
    await prisma.$executeRaw`
      UPDATE bookings SET has_dispute = ${!won}, updated_at = NOW() WHERE id = ${payment.booking_id}
    `.catch(() => {});
  }

  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
  const bookingRef = payment.booking_number || `Payment #${payment.id}`;
  const outcomeLabel = won ? 'WON' : 'LOST';
  const color = won ? '#16a34a' : '#dc2626';

  await sendEmail({
    to: staffEmail,
    subject: `Dispute ${outcomeLabel}: ${bookingRef} ($${amountDollars.toFixed(2)})`,
    html: `
      <h2 style="color: ${color};">Dispute ${outcomeLabel}</h2>
      <p>A payment dispute has been resolved.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Dispute ID</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${id}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Outcome</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: ${color};">${outcomeLabel}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Booking</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${bookingRef}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">$${amountDollars.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${reason || 'Not specified'}</td></tr>
      </table>
      ${
        won
          ? '<p style="margin-top: 16px;">Funds have been returned. Payment status restored.</p>'
          : '<p style="margin-top: 16px; color: #dc2626;">Funds were not returned. The payment has been marked as lost.</p>'
      }
      <p><a href="https://dashboard.stripe.com/disputes/${id}" style="background: #374151; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in Stripe Dashboard</a></p>
    `,
    text: `Dispute ${outcomeLabel}: ${bookingRef} — $${amountDollars.toFixed(2)} — Reason: ${reason || 'Not specified'}. View at https://dashboard.stripe.com/disputes/${id}`,
  }).catch((err) => {
    logger.error('[Stripe Webhook] Failed to send dispute outcome email', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Handle charge.dispute.funds_withdrawn — Stripe has debited the disputed amount.
 */
export async function handleDisputeFundsWithdrawn(dispute: Stripe.Dispute) {
  const { id } = dispute;
  const amountDollars = dispute.amount / 100;

  logger.error('[Stripe Webhook] Dispute funds withdrawn', {
    disputeId: id,
    amount: amountDollars,
  });

  Sentry.captureException(new Error(`Stripe dispute funds withdrawn: ${id}`), {
    level: 'error',
    tags: { 'stripe.dispute_id': id },
    extra: { amount: amountDollars },
  });

  const payment = await findPaymentForDispute(dispute);
  if (!payment) return;

  // dispute_amount not in Prisma schema — raw SQL
  await prisma.$executeRaw`
    UPDATE payments SET dispute_amount = ${amountDollars}, updated_at = NOW() WHERE id = ${payment.id}
  `.catch(() => {});
}

/**
 * Handle charge.dispute.funds_reinstated — Stripe has returned funds after a won dispute.
 */
export async function handleDisputeFundsReinstated(dispute: Stripe.Dispute) {
  const { id } = dispute;
  const amountDollars = dispute.amount / 100;

  logger.info('[Stripe Webhook] Dispute funds reinstated', {
    disputeId: id,
    amount: amountDollars,
  });

  Sentry.captureMessage(`Stripe dispute funds reinstated: ${id}`, {
    level: 'info',
    tags: { 'stripe.dispute_id': id },
    extra: { amount: amountDollars },
  });

  const payment = await findPaymentForDispute(dispute);
  if (!payment) return;

  // dispute_amount not in Prisma schema — raw SQL
  await prisma.$executeRaw`
    UPDATE payments SET dispute_amount = 0, updated_at = NOW() WHERE id = ${payment.id}
  `.catch(() => {});

  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
  const bookingRef = payment.booking_number || `Payment #${payment.id}`;
  await sendEmail({
    to: staffEmail,
    subject: `Funds Reinstated: ${bookingRef} ($${amountDollars.toFixed(2)})`,
    html: `
      <h2 style="color: #16a34a;">Dispute Funds Reinstated</h2>
      <p>Stripe has returned $${amountDollars.toFixed(2)} for <strong>${bookingRef}</strong> (Dispute ${id}).</p>
      <p><a href="https://dashboard.stripe.com/disputes/${id}" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in Stripe Dashboard</a></p>
    `,
    text: `Funds reinstated: ${bookingRef} — $${amountDollars.toFixed(2)}. View at https://dashboard.stripe.com/disputes/${id}`,
  }).catch((err) => {
    logger.error('[Stripe Webhook] Failed to send funds reinstated email', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
