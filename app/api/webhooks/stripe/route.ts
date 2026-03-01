import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getStripe } from '@/lib/stripe';
import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { auditService } from '@/lib/services/audit.service';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { sendSharedTourConfirmationEmail } from '@/lib/email/templates/shared-tour-confirmation';
import { tipService } from '@/lib/services/tip.service';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for payment processing
 *
 * Handles:
 * - payment_intent.succeeded: Confirm payment and update records
 * - payment_intent.payment_failed: Log failure and notify
 * - charge.refunded: Update payment status
 * - charge.dispute.created: Log dispute and notify admin
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  // Support webhook secrets from all Stripe accounts (NW Touring + WWT, live + test)
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET_LIVE,        // NW Touring live
    process.env.STRIPE_WEBHOOK_SECRET_WWT_LIVE,    // Walla Walla Travel live
    process.env.STRIPE_WEBHOOK_SECRET,              // NW Touring test
    process.env.STRIPE_WEBHOOK_SECRET_WWT_TEST,    // Walla Walla Travel test
  ].filter(Boolean) as string[];

  if (webhookSecrets.length === 0) {
    logger.warn('[Stripe Webhook] No webhook secrets configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  if (!signature) {
    logger.warn('[Stripe Webhook] Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event | undefined;

  // Try each secret until one verifies (live secret first)
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
    // C11 FIX: Don't expose internal error details in the response
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }

  logger.info('[Stripe Webhook] Event received', {
    type: event.type,
    id: event.id,
  });

  // Audit log: webhook event received (non-blocking)
  auditService.logActivity({
    userId: 0, // System event
    action: 'payment_webhook_received',
    details: { eventType: event.type, eventId: event.id },
  }).catch(() => {});

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        // Handle shared tour ticket failures separately
        if (failedPayment.metadata.type === 'shared_tour_ticket') {
          await handleSharedTourPaymentFailed(failedPayment);
        } else if (failedPayment.metadata.type === 'driver_tip') {
          await handleDriverTipPaymentFailed(failedPayment);
        } else {
          await handlePaymentIntentFailed(failedPayment);
        }
        break;
      }

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        logger.info('[Stripe Webhook] Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('[Stripe Webhook] Error processing event', {
      type: event.type,
      error: err,
    });
    // Return 200 to prevent Stripe from retrying (we've logged the error)
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;

  logger.info('[Stripe Webhook] Payment succeeded', {
    paymentIntentId: id,
    amount: amount / 100,
    metadata,
  });

  // Check if this is a trip proposal deposit payment
  if (metadata.payment_type === 'trip_proposal_deposit' && metadata.trip_proposal_id) {
    await handleTripProposalPaymentSuccess(paymentIntent);
    return;
  }

  // Check if this is a proposal payment
  if (metadata.payment_type === 'proposal_deposit' && metadata.proposal_id) {
    await handleProposalPaymentSuccess(paymentIntent);
    return;
  }

  // Check if this is a booking payment
  if (metadata.booking_id) {
    await handleBookingPaymentSuccess(paymentIntent);
    return;
  }

  // Check if this is a shared tour ticket payment
  if (metadata.type === 'shared_tour_ticket' && metadata.ticket_id) {
    await handleSharedTourPaymentSuccess(paymentIntent);
    return;
  }

  // Check if this is a guest share or group payment
  if ((metadata.payment_type === 'guest_share' || metadata.payment_type === 'group_payment') && metadata.guest_id) {
    await handleGuestPaymentSuccess(paymentIntent);
    return;
  }

  // Check if this is a driver tip payment
  if (metadata.type === 'driver_tip' && metadata.tip_code) {
    await handleDriverTipPaymentSuccess(paymentIntent);
    return;
  }

  // Find payment record by payment_intent_id
  const payment = await queryOne(
    `SELECT * FROM payments WHERE stripe_payment_intent_id = $1`,
    [id]
  );

  if (!payment) {
    logger.warn('[Stripe Webhook] No payment record found for PaymentIntent', { id });
    return;
  }

  // Update payment status
  await query(
    `UPDATE payments
     SET status = 'succeeded',
         succeeded_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [payment.id]
  );

  // Update booking if linked
  if (payment.booking_id) {
    await handleBookingPaymentSuccess(paymentIntent, payment.booking_id);
  }
}

/**
 * Handle proposal deposit payment success
 */
async function handleProposalPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const proposalId = parseInt(metadata.proposal_id);

  logger.info('[Stripe Webhook] Processing proposal payment', {
    paymentIntentId: id,
    proposalId,
    amount: amount / 100,
  });

  // Check if already processed
  const proposal = await queryOne(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    logger.warn('[Stripe Webhook] Proposal not found', { proposalId });
    return;
  }

  // If already converted, skip
  if (proposal.converted_to_booking_id) {
    logger.info('[Stripe Webhook] Proposal already converted', {
      proposalId,
      bookingId: proposal.converted_to_booking_id,
    });
    return;
  }

  // Update proposal payment status (if columns exist)
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

  // Don't auto-convert here - let the client-side confirmation handle it
  // This webhook is for recovery/backup
  logger.info('[Stripe Webhook] Proposal payment recorded', {
    proposalId,
    amount: amount / 100,
  });
}

/**
 * Handle booking payment success (deposit or final)
 */
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
    // Update payment record
    await query(
      `UPDATE payments
       SET status = 'succeeded',
           succeeded_at = NOW(),
           updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [id],
      client
    );

    // Update booking based on payment type
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

    // Create timeline entry
    await query(
      `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        targetBookingId,
        `payment_${paymentType}_succeeded`,
        `${paymentType === 'deposit' ? 'Deposit' : 'Final payment'} of $${(amount / 100).toFixed(2)} received`,
      ],
      client
    ).catch(() => {
      // Timeline table might not exist
    });

    // Create invoice record for this payment
    await query(
      `INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
       VALUES ($1, $2, $3, 0, $3, 'paid', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [targetBookingId, paymentType, amount / 100],
      client
    ).catch((err) => {
      // Invoice table might not exist or have different schema
      logger.warn('[Stripe Webhook] Could not create invoice record', { error: String(err) });
    });
  });

  // Send confirmation email
  sendBookingConfirmationEmail(targetBookingId).catch(err => {
    logger.error('[Stripe Webhook] Failed to send confirmation email', { error: err });
  });
}

/**
 * Handle failed payment
 * Updates payment record, booking status, and proposal if applicable
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;

  logger.warn('[Stripe Webhook] Payment failed', {
    paymentIntentId: id,
    metadata,
    error: last_payment_error?.message,
  });

  const failureReason = last_payment_error?.message || 'Payment failed';

  await withTransaction(async (client) => {
    // Update payment record
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

    // Update booking status if linked
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

      // Create timeline entry
      await query(
        `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
         VALUES ($1, 'payment_failed', $2, NOW())`,
        [bookingId, `Payment failed: ${failureReason}`],
        client
      ).catch(() => {
        // Timeline table might not exist
      });

      logger.warn('[Stripe Webhook] Booking payment failed', {
        bookingId,
        paymentIntentId: id,
        reason: failureReason,
      });
    }

    // Update proposal if applicable
    if (metadata.proposal_id) {
      try {
        await query(
          `UPDATE proposals
           SET payment_status = 'failed',
               updated_at = NOW()
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

/**
 * Handle refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const { id, payment_intent, amount_refunded } = charge;

  logger.info('[Stripe Webhook] Charge refunded', {
    chargeId: id,
    paymentIntentId: payment_intent,
    amountRefunded: amount_refunded / 100,
  });

  // Update payment record - extract ID if payment_intent is an object
  const paymentIntentId = typeof payment_intent === 'string' ? payment_intent : payment_intent?.id;
  await query(
    `UPDATE payments
     SET status = 'refunded',
         refunded_at = NOW(),
         updated_at = NOW()
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntentId]
  );
}

/**
 * Handle dispute created
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const { id, charge, amount, reason } = dispute;

  logger.error('[Stripe Webhook] DISPUTE CREATED', {
    disputeId: id,
    chargeId: charge,
    amount: amount / 100,
    reason,
  });

  // Find the payment - extract ID if charge is an object
  const chargeId = typeof charge === 'string' ? charge : charge?.id;
  const payment = await queryOne(
    `SELECT p.*, b.booking_number
     FROM payments p
     LEFT JOIN bookings b ON p.booking_id = b.id
     WHERE p.stripe_charge_id = $1`,
    [chargeId]
  );

  if (payment) {
    // Log the dispute
    logger.error('[Stripe Webhook] Dispute linked to booking', {
      paymentId: payment.id,
      bookingNumber: payment.booking_number,
      amount: amount / 100,
      reason,
    });

    // TODO: Send admin notification email
    // TODO: Update payment status to 'disputed'
  }
}

/**
 * Handle shared tour ticket payment success
 *
 * IDEMPOTENT: Checks if payment was already processed before sending confirmation email.
 * This prevents duplicate emails when Stripe retries webhooks.
 */
async function handleSharedTourPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const ticketId = metadata.ticket_id;

  logger.info('[Stripe Webhook] Processing shared tour ticket payment', {
    paymentIntentId: id,
    ticketId,
    ticketNumber: metadata.ticket_number,
    amount: amount / 100,
  });

  // Get current ticket state to check if already processed
  const existingTicket = await sharedTourService.getTicketById(ticketId);
  const wasAlreadyPaid = existingTicket?.payment_status === 'paid';

  // Confirm the payment in the service (idempotent - returns existing if already paid)
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

  // IDEMPOTENCY: Only send email if this is first-time confirmation
  // Prevents duplicate emails on webhook retries
  if (wasAlreadyPaid) {
    logger.info('[Stripe Webhook] Skipping confirmation email (already sent on previous webhook)', {
      ticketId: ticket.id,
      paymentIntentId: id,
    });
    return;
  }

  // Send confirmation email (only on first confirmation)
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
}

/**
 * Handle shared tour ticket payment failure
 */
async function handleSharedTourPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;
  const ticketId = metadata.ticket_id;

  logger.warn('[Stripe Webhook] Shared tour ticket payment failed', {
    paymentIntentId: id,
    ticketId,
    ticketNumber: metadata.ticket_number,
    error: last_payment_error?.message,
  });

  // Log the failure in the service
  await sharedTourService.handlePaymentFailed(id, last_payment_error?.message);
}

/**
 * Handle guest share or group payment success
 * Idempotent: checks for existing guest_payments record before inserting
 */
async function handleGuestPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, amount } = paymentIntent;
  const paymentAmount = amount / 100;

  logger.info('[Stripe Webhook] Processing guest payment', {
    paymentIntentId: id,
    paymentType: metadata.payment_type,
    guestIds: metadata.guest_id || metadata.guest_ids,
    amount: paymentAmount,
  });

  // Idempotency: check if already recorded
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
    // Group payment: distribute across multiple guests
    const guestIds = metadata.guest_ids.split(',').map((s: string) => parseInt(s)).filter((n: number) => !isNaN(n));

    await withTransaction(async (client) => {
      for (const guestId of guestIds) {
        const guest = await queryOne<{ amount_owed: string; amount_paid: string }>(
          'SELECT amount_owed, amount_paid FROM trip_proposal_guests WHERE id = $1',
          [guestId],
          client
        );
        if (!guest) continue;

        const remaining = Math.max(0, (parseFloat(guest.amount_owed) || 0) - (parseFloat(guest.amount_paid) || 0));
        if (remaining <= 0) continue;

        // Record payment for this guest
        await query(
          `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status, paid_by_guest_id)
           VALUES ($1, $2, $3, $4, 'group_payment', 'succeeded', NULL)
           ON CONFLICT DO NOTHING`,
          [proposalId, guestId, remaining, id],
          client
        );

        // Update guest
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
    // Individual guest payment
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
    paymentIntentId: id, proposalId, amount: paymentAmount,
  });
}

/**
 * Handle driver tip payment success
 */
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

/**
 * Handle trip proposal deposit payment success
 * Updates deposit_paid status and inserts payment record.
 * Idempotent: checks if already paid before updating.
 */
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

  // Check if already processed (idempotent)
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

  // Update deposit status
  await withTransaction(async (client) => {
    const updateResult = await query(
      `UPDATE trip_proposals
       SET deposit_paid = true,
           deposit_paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND deposit_paid = false`,
      [tripProposalId],
      client
    );

    // If no rows updated, another process already handled this
    if (updateResult.rowCount === 0) {
      return;
    }

    // Insert payment record (best-effort)
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

  // Send deposit received email (non-blocking, check for idempotency)
  try {
    const alreadySent = await queryOne(
      `SELECT id FROM email_logs
       WHERE trip_proposal_id = $1 AND email_type = 'trip_proposal_deposit_received'
       LIMIT 1`,
      [tripProposalId]
    );

    if (!alreadySent) {
      // Dynamic import to avoid circular dependencies
      const { tripProposalEmailService } = await import('@/lib/services/trip-proposal-email.service');
      await tripProposalEmailService.sendDepositReceivedEmail(tripProposalId, amount / 100);
    } else {
      logger.info('[Stripe Webhook] Deposit email already sent for trip proposal', { tripProposalId });
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

/**
 * Handle driver tip payment failure
 */
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
