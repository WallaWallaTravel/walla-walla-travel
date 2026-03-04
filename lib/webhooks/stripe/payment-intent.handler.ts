/**
 * Stripe webhook handlers for payment_intent events.
 *
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */

import Stripe from 'stripe';
import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { sendSharedTourConfirmationEmail } from '@/lib/email/templates/shared-tour-confirmation';
import { sendPartnerPaymentReceivedEmail } from '@/lib/email/templates/partner-payment-received';
import { tipService } from '@/lib/services/tip.service';

/**
 * Handle payment_intent.succeeded — routes to the correct sub-handler
 * based on metadata (booking, proposal, shared tour, tip, guest share).
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const { id, metadata, amount } = paymentIntent;

  logger.info('[Stripe Webhook] Payment succeeded', {
    paymentIntentId: id,
    amount: amount / 100,
    metadata,
  });

  if (metadata.payment_type === 'trip_proposal_deposit' && metadata.trip_proposal_id) {
    await handleTripProposalPaymentSuccess(paymentIntent);
    return;
  }

  if (metadata.payment_type === 'proposal_deposit' && metadata.proposal_id) {
    await handleProposalPaymentSuccess(paymentIntent);
    return;
  }

  if (metadata.booking_id) {
    await handleBookingPaymentSuccess(paymentIntent);
    return;
  }

  if (metadata.type === 'shared_tour_ticket' && metadata.ticket_id) {
    await handleSharedTourPaymentSuccess(paymentIntent);
    return;
  }

  if (
    (metadata.payment_type === 'guest_share' ||
      metadata.payment_type === 'group_payment') &&
    metadata.guest_id
  ) {
    await handleGuestPaymentSuccess(paymentIntent);
    return;
  }

  if (metadata.type === 'driver_tip' && metadata.tip_code) {
    await handleDriverTipPaymentSuccess(paymentIntent);
    return;
  }

  // Fallback: look up payment by stripe_payment_intent_id
  const payment = await queryOne(
    `SELECT * FROM payments WHERE stripe_payment_intent_id = $1`,
    [id]
  );

  if (!payment) {
    logger.warn('[Stripe Webhook] No payment record found for PaymentIntent', { id });
    return;
  }

  await query(
    `UPDATE payments
     SET status = 'succeeded', succeeded_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [payment.id]
  );

  if (payment.booking_id) {
    await handleBookingPaymentSuccess(paymentIntent, payment.booking_id);
  }
}

/**
 * Handle payment_intent.payment_failed — routes based on metadata type.
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const { metadata } = paymentIntent;

  if (metadata.type === 'shared_tour_ticket') {
    await handleSharedTourPaymentFailed(paymentIntent);
  } else if (metadata.type === 'driver_tip') {
    await handleDriverTipPaymentFailed(paymentIntent);
  } else {
    await handleGenericPaymentFailed(paymentIntent);
  }
}

// ---------------------------------------------------------------------------
// Sub-handlers
// ---------------------------------------------------------------------------

async function handleProposalPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const proposalId = parseInt(metadata.proposal_id);

  logger.info('[Stripe Webhook] Processing proposal payment', {
    paymentIntentId: id,
    proposalId,
    amount: amount / 100,
  });

  const proposal = await queryOne(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    logger.warn('[Stripe Webhook] Proposal not found', { proposalId });
    return;
  }

  if (proposal.converted_to_booking_id) {
    logger.info('[Stripe Webhook] Proposal already converted', {
      proposalId,
      bookingId: proposal.converted_to_booking_id,
    });
    return;
  }

  try {
    await query(
      `UPDATE proposals
       SET payment_status = 'succeeded',
           payment_amount = $1,
           payment_date = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [amount / 100, proposalId]
    );
  } catch (err) {
    logger.warn('[Stripe Webhook] Could not update proposal payment columns', { error: err });
  }

  logger.info('[Stripe Webhook] Proposal payment recorded', {
    proposalId,
    amount: amount / 100,
  });
}

async function handleBookingPaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  bookingId?: number
) {
  const { id, metadata, amount } = paymentIntent;
  const targetBookingId = bookingId || parseInt(metadata.booking_id);
  const paymentType = metadata.payment_type || 'deposit';

  logger.info('[Stripe Webhook] Processing booking payment', {
    paymentIntentId: id,
    bookingId: targetBookingId,
    paymentType,
    amount: amount / 100,
  });

  await withTransaction(async (client) => {
    await query(
      `UPDATE payments
       SET status = 'succeeded', succeeded_at = NOW(), updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [id],
      client
    );

    if (paymentType === 'deposit') {
      await query(
        `UPDATE bookings
         SET deposit_paid = true,
             deposit_paid_at = NOW(),
             status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
             updated_at = NOW()
         WHERE id = $1`,
        [targetBookingId],
        client
      );
    } else if (paymentType === 'final_payment') {
      await query(
        `UPDATE bookings
         SET final_payment_paid = true,
             final_payment_paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [targetBookingId],
        client
      );
    }

    await query(
      `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        targetBookingId,
        `payment_${paymentType}_succeeded`,
        `${paymentType === 'deposit' ? 'Deposit' : 'Final payment'} of $${(amount / 100).toFixed(2)} received`,
      ],
      client
    ).catch(() => {});

    await query(
      `INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
       VALUES ($1, $2, $3, 0, $3, 'paid', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [targetBookingId, paymentType, amount / 100],
      client
    ).catch((err) => {
      logger.warn('[Stripe Webhook] Could not create invoice record', { error: String(err) });
    });
  });

  sendBookingConfirmationEmail(targetBookingId).catch((err) => {
    logger.error('[Stripe Webhook] Failed to send confirmation email', { error: err });
  });
}

async function handleGenericPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;

  logger.warn('[Stripe Webhook] Payment failed', {
    paymentIntentId: id,
    metadata,
    error: last_payment_error?.message,
  });

  const failureReason = last_payment_error?.message || 'Payment failed';

  await withTransaction(async (client) => {
    await query(
      `UPDATE payments
       SET status = 'failed',
           failure_reason = $2,
           failed_at = NOW(),
           updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [id, failureReason],
      client
    );

    if (metadata.booking_id) {
      const bookingId = parseInt(metadata.booking_id);
      await query(
        `UPDATE bookings
         SET payment_status = 'failed',
             payment_failure_reason = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [bookingId, failureReason],
        client
      );

      await query(
        `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
         VALUES ($1, 'payment_failed', $2, NOW())`,
        [bookingId, `Payment failed: ${failureReason}`],
        client
      ).catch(() => {});

      logger.warn('[Stripe Webhook] Booking payment failed', {
        bookingId,
        paymentIntentId: id,
        reason: failureReason,
      });
    }

    if (metadata.proposal_id) {
      try {
        await query(
          `UPDATE proposals
           SET payment_status = 'failed', updated_at = NOW()
           WHERE id = $1`,
          [parseInt(metadata.proposal_id)],
          client
        );
      } catch (err) {
        logger.warn('[Stripe Webhook] Could not update proposal payment status', { error: err });
      }
    }
  });
}

async function handleSharedTourPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const ticketId = metadata.ticket_id;

  logger.info('[Stripe Webhook] Processing shared tour ticket payment', {
    paymentIntentId: id,
    ticketId,
    ticketNumber: metadata.ticket_number,
    amount: amount / 100,
  });

  const existingTicket = await sharedTourService.getTicketById(ticketId);
  const wasAlreadyPaid = existingTicket?.payment_status === 'paid';

  const ticket = await sharedTourService.confirmPayment(id);

  if (!ticket) {
    logger.error('[Stripe Webhook] Failed to confirm shared tour ticket payment', {
      paymentIntentId: id,
      ticketId,
    });
    return;
  }

  logger.info('[Stripe Webhook] Shared tour ticket payment confirmed', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    customerEmail: ticket.customer_email,
    wasAlreadyPaid,
  });

  if (wasAlreadyPaid) {
    logger.info('[Stripe Webhook] Skipping confirmation email (already sent)', {
      ticketId: ticket.id,
      paymentIntentId: id,
    });
    return;
  }

  try {
    await sendSharedTourConfirmationEmail(ticket.id);
    logger.info('[Stripe Webhook] Sent shared tour confirmation email', {
      ticketId: ticket.id,
      customerEmail: ticket.customer_email,
    });
  } catch (error) {
    logger.error('[Stripe Webhook] Failed to send shared tour confirmation email', {
      ticketId: ticket.id,
      error,
    });
  }

  // Notify hotel partner if this was a partner-booked ticket
  try {
    await sendPartnerPaymentReceivedEmail(ticket.id);
  } catch (error) {
    logger.error('[Stripe Webhook] Failed to send partner payment notification', {
      ticketId: ticket.id,
      error,
    });
  }
}

async function handleSharedTourPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;

  logger.warn('[Stripe Webhook] Shared tour ticket payment failed', {
    paymentIntentId: id,
    ticketId: metadata.ticket_id,
    ticketNumber: metadata.ticket_number,
    error: last_payment_error?.message,
  });

  await sharedTourService.handlePaymentFailed(id, last_payment_error?.message);
}

async function handleGuestPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const paymentAmount = amount / 100;

  logger.info('[Stripe Webhook] Processing guest payment', {
    paymentIntentId: id,
    paymentType: metadata.payment_type,
    guestIds: metadata.guest_id || metadata.guest_ids,
    amount: paymentAmount,
  });

  const existing = await queryOne(
    'SELECT id FROM guest_payments WHERE stripe_payment_intent_id = $1',
    [id]
  );
  if (existing) {
    logger.info('[Stripe Webhook] Guest payment already processed', { paymentIntentId: id });
    return;
  }

  const proposalId = parseInt(metadata.trip_proposal_id);

  if (metadata.payment_type === 'group_payment' && metadata.guest_ids) {
    const guestIds = metadata.guest_ids
      .split(',')
      .map((s: string) => parseInt(s))
      .filter((n: number) => !isNaN(n));

    await withTransaction(async (client) => {
      for (const guestId of guestIds) {
        const guest = await queryOne<{ amount_owed: string; amount_paid: string }>(
          'SELECT amount_owed, amount_paid FROM trip_proposal_guests WHERE id = $1',
          [guestId],
          client
        );
        if (!guest) continue;

        const remaining = Math.max(
          0,
          (parseFloat(guest.amount_owed) || 0) - (parseFloat(guest.amount_paid) || 0)
        );
        if (remaining <= 0) continue;

        await query(
          `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status, paid_by_guest_id)
           VALUES ($1, $2, $3, $4, 'group_payment', 'succeeded', NULL)
           ON CONFLICT DO NOTHING`,
          [proposalId, guestId, remaining, id],
          client
        );

        const newPaid = (parseFloat(guest.amount_paid) || 0) + remaining;
        const owed = parseFloat(guest.amount_owed) || 0;
        const status = newPaid >= owed ? 'paid' : 'partial';

        await query(
          `UPDATE trip_proposal_guests
           SET amount_paid = $1, payment_status = $2,
               payment_paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE payment_paid_at END,
               updated_at = NOW()
           WHERE id = $3`,
          [newPaid, status, guestId],
          client
        );
      }
    });
  } else {
    const guestId = parseInt(metadata.guest_id);

    await withTransaction(async (client) => {
      await query(
        `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status)
         VALUES ($1, $2, $3, $4, 'guest_share', 'succeeded')
         ON CONFLICT DO NOTHING`,
        [proposalId, guestId, paymentAmount, id],
        client
      );

      const guest = await queryOne<{ amount_owed: string; amount_paid: string }>(
        'SELECT amount_owed, amount_paid FROM trip_proposal_guests WHERE id = $1',
        [guestId],
        client
      );
      if (guest) {
        const newPaid = (parseFloat(guest.amount_paid) || 0) + paymentAmount;
        const owed = parseFloat(guest.amount_owed) || 0;
        const status = newPaid >= owed ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        await query(
          `UPDATE trip_proposal_guests
           SET amount_paid = $1, payment_status = $2,
               payment_paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE payment_paid_at END,
               updated_at = NOW()
           WHERE id = $3`,
          [newPaid, status, guestId],
          client
        );
      }
    });
  }

  logger.info('[Stripe Webhook] Guest payment recorded', {
    paymentIntentId: id,
    proposalId,
    amount: paymentAmount,
  });
}

async function handleDriverTipPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;

  logger.info('[Stripe Webhook] Processing driver tip payment', {
    paymentIntentId: id,
    tipCode: metadata.tip_code,
    bookingId: metadata.booking_id,
    driverName: metadata.driver_name,
    amount: amount / 100,
  });

  try {
    await tipService.processTipPaymentSuccess(paymentIntent);
    logger.info('[Stripe Webhook] Driver tip payment confirmed', {
      paymentIntentId: id,
      amount: amount / 100,
    });
  } catch (error) {
    logger.error('[Stripe Webhook] Failed to process driver tip payment', {
      paymentIntentId: id,
      error,
    });
  }
}

async function handleTripProposalPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const tripProposalId = parseInt(metadata.trip_proposal_id, 10);
  if (isNaN(tripProposalId)) {
    logger.warn('[Stripe Webhook] Invalid trip_proposal_id in metadata', { metadata });
    return;
  }

  logger.info('[Stripe Webhook] Processing trip proposal deposit payment', {
    paymentIntentId: id,
    tripProposalId,
    proposalNumber: metadata.proposal_number,
    amount: amount / 100,
  });

  const proposal = await queryOne(
    `SELECT id, deposit_paid, proposal_number FROM trip_proposals WHERE id = $1`,
    [tripProposalId]
  );

  if (!proposal) {
    logger.warn('[Stripe Webhook] Trip proposal not found', { tripProposalId });
    return;
  }

  if (proposal.deposit_paid) {
    logger.info('[Stripe Webhook] Trip proposal deposit already marked as paid', {
      tripProposalId,
      proposalNumber: proposal.proposal_number,
    });
    return;
  }

  await withTransaction(async (client) => {
    const updateResult = await query(
      `UPDATE trip_proposals
       SET deposit_paid = true, deposit_paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deposit_paid = false`,
      [tripProposalId],
      client
    );

    if (updateResult.rowCount === 0) return;

    await query(
      `INSERT INTO payments (
        trip_proposal_id, amount, payment_type,
        stripe_payment_intent_id, status, created_at
      ) VALUES ($1, $2, 'trip_proposal_deposit', $3, 'succeeded', NOW())
      ON CONFLICT DO NOTHING`,
      [tripProposalId, amount / 100, id],
      client
    ).catch((err) => {
      logger.warn('[Stripe Webhook] Could not insert payment record for trip proposal', {
        error: String(err),
        tripProposalId,
      });
    });
  });

  try {
    const alreadySent = await queryOne(
      `SELECT id FROM email_logs
       WHERE trip_proposal_id = $1 AND email_type = 'trip_proposal_deposit_received'
       LIMIT 1`,
      [tripProposalId]
    );

    if (!alreadySent) {
      const { tripProposalEmailService } = await import(
        '@/lib/services/trip-proposal-email.service'
      );
      await tripProposalEmailService.sendDepositReceivedEmail(tripProposalId, amount / 100);
    } else {
      logger.info('[Stripe Webhook] Deposit email already sent for trip proposal', {
        tripProposalId,
      });
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to send trip proposal deposit email', {
      error: err,
      tripProposalId,
    });
  }

  logger.info('[Stripe Webhook] Trip proposal deposit payment recorded', {
    tripProposalId,
    proposalNumber: metadata.proposal_number,
    amount: amount / 100,
  });
}

async function handleDriverTipPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;

  logger.warn('[Stripe Webhook] Driver tip payment failed', {
    paymentIntentId: id,
    tipCode: metadata.tip_code,
    error: last_payment_error?.message,
  });

  try {
    await tipService.processTipPaymentFailed(id);
  } catch (error) {
    logger.error('[Stripe Webhook] Failed to update tip payment failure status', {
      paymentIntentId: id,
      error,
    });
  }
}
