/**
 * Stripe webhook handlers for payment_intent events.
 *
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */

import Stripe from 'stripe';
import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { SharedTourTicket } from '@/lib/services/shared-tour.service';
import { sendSharedTourConfirmationEmail, PortalLinkInfo } from '@/lib/email/templates/shared-tour-confirmation';
import { sendPartnerPaymentReceivedEmail } from '@/lib/email/templates/partner-payment-received';
import { tipService } from '@/lib/services/tip.service';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { guestProfileService } from '@/lib/services/guest-profile.service';

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

  // Fallback: look up payment by stripe_payment_intent_id (Prisma — payments is not @@ignore)
  const payment = await prisma.payments.findFirst({
    where: { stripe_payment_intent_id: id },
  });

  if (!payment) {
    logger.warn('[Stripe Webhook] No payment record found for PaymentIntent', { id });
    return;
  }

  await prisma.payments.update({
    where: { id: payment.id },
    data: { status: 'succeeded', succeeded_at: new Date(), updated_at: new Date() },
  });

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

  // proposals table may not be a Prisma model — use raw SQL
  const proposals = await prisma.$queryRaw<{ id: number; converted_to_booking_id: number | null }[]>`
    SELECT id, converted_to_booking_id FROM proposals WHERE id = ${proposalId}
  `;

  const proposal = proposals[0];
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
    await prisma.$executeRaw`
      UPDATE proposals
      SET payment_status = 'succeeded',
          payment_amount = ${amount / 100},
          payment_date = NOW(),
          updated_at = NOW()
      WHERE id = ${proposalId}
    `;
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

  // Use Prisma for payments & bookings (not @@ignore), raw SQL for @@ignore tables
  await prisma.$transaction(async (tx) => {
    // Update payment status via Prisma
    await tx.payments.updateMany({
      where: { stripe_payment_intent_id: id },
      data: { status: 'succeeded', succeeded_at: new Date(), updated_at: new Date() },
    });

    // Update booking based on payment type via Prisma
    if (paymentType === 'deposit') {
      // Need conditional status update — use raw SQL for the CASE expression
      await tx.$executeRaw`
        UPDATE bookings
        SET deposit_paid = true,
            deposit_paid_at = NOW(),
            status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
            updated_at = NOW()
        WHERE id = ${targetBookingId}
      `;
    } else if (paymentType === 'final_payment') {
      await tx.bookings.update({
        where: { id: targetBookingId },
        data: {
          final_payment_paid: true,
          final_payment_paid_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    // booking_timeline is @@ignore — raw SQL
    await tx.$executeRaw`
      INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
      VALUES (
        ${targetBookingId},
        ${`payment_${paymentType}_succeeded`},
        ${`${paymentType === 'deposit' ? 'Deposit' : 'Final payment'} of $${(amount / 100).toFixed(2)} received`},
        NOW()
      )
    `.catch(() => {});

    // invoices is @@ignore — raw SQL
    await tx.$executeRaw`
      INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
      VALUES (${targetBookingId}, ${paymentType}, ${amount / 100}, 0, ${amount / 100}, 'paid', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `.catch((err) => {
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

  await prisma.$transaction(async (tx) => {
    // Update payment status via Prisma
    await tx.payments.updateMany({
      where: { stripe_payment_intent_id: id },
      data: {
        status: 'failed',
        failure_reason: failureReason,
        failed_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (metadata.booking_id) {
      const bookingId = parseInt(metadata.booking_id);
      // payment_status and payment_failure_reason may not be in Prisma schema — use raw SQL
      await tx.$executeRaw`
        UPDATE bookings
        SET payment_status = ${failureReason},
            payment_failure_reason = ${failureReason},
            updated_at = NOW()
        WHERE id = ${bookingId}
      `.catch(() => {});

      // booking_timeline is @@ignore
      await tx.$executeRaw`
        INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
        VALUES (${bookingId}, 'payment_failed', ${`Payment failed: ${failureReason}`}, NOW())
      `.catch(() => {});

      logger.warn('[Stripe Webhook] Booking payment failed', {
        bookingId,
        paymentIntentId: id,
        reason: failureReason,
      });
    }

    if (metadata.proposal_id) {
      try {
        await tx.$executeRaw`
          UPDATE proposals
          SET payment_status = 'failed', updated_at = NOW()
          WHERE id = ${parseInt(metadata.proposal_id)}
        `;
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

  // Auto-create trip_proposal_guest records (non-blocking)
  let portalInfo: PortalLinkInfo | null = null;
  try {
    portalInfo = await autoCreateProposalGuests(ticket);
  } catch (error) {
    logger.error('[Stripe Webhook] Failed to auto-create proposal guests', {
      ticketId: ticket.id,
      error,
    });
  }

  try {
    await sendSharedTourConfirmationEmail(ticket.id, portalInfo);
    logger.info('[Stripe Webhook] Sent shared tour confirmation email', {
      ticketId: ticket.id,
      customerEmail: ticket.customer_email,
      hasPortalLink: !!portalInfo,
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

/**
 * Auto-create trip_proposal_guest records when a shared tour ticket is purchased
 * and the tour is linked to a trip proposal.
 *
 * Returns portal link info if guests were successfully created, null otherwise.
 */
async function autoCreateProposalGuests(ticket: SharedTourTicket): Promise<PortalLinkInfo | null> {
  // Look up the shared tour's trip_proposal_id
  const tour = await queryOne<{ trip_proposal_id: number | null }>(
    'SELECT trip_proposal_id FROM shared_tours WHERE id = $1',
    [ticket.tour_id]
  );

  if (!tour?.trip_proposal_id) {
    logger.info('[Shared Tour] No trip_proposal_id set on tour, skipping guest creation', {
      ticketId: ticket.id,
      tourId: ticket.tour_id,
    });
    return null;
  }

  const proposalId = tour.trip_proposal_id;

  // Verify the proposal exists
  const proposal = await tripProposalService.getById(proposalId);
  if (!proposal) {
    logger.warn('[Shared Tour] Linked trip proposal not found', { proposalId, ticketId: ticket.id });
    return null;
  }

  // Check if primary guest already exists on proposal (by email)
  if (ticket.customer_email) {
    const alreadyExists = await tripProposalService.isEmailRegistered(
      proposalId,
      ticket.customer_email
    );
    if (alreadyExists) {
      logger.info('[Shared Tour] Primary guest already on proposal, skipping', {
        ticketId: ticket.id,
        email: ticket.customer_email,
        proposalId,
      });
      // Still return portal info so email can include the link
      const existingGuest = await queryOne<{ guest_access_token: string }>(
        'SELECT guest_access_token FROM trip_proposal_guests WHERE trip_proposal_id = $1 AND LOWER(email) = LOWER($2)',
        [proposalId, ticket.customer_email]
      );
      if (existingGuest) {
        return {
          proposalAccessToken: proposal.access_token,
          primaryGuestAccessToken: existingGuest.guest_access_token,
        };
      }
      return null;
    }
  }

  // Find or create guest profile for linking
  let guestProfileId: number | undefined;
  if (ticket.customer_email) {
    try {
      const profile = await guestProfileService.findOrCreateByEmail(
        ticket.customer_email,
        { name: ticket.customer_name, phone: ticket.customer_phone }
      );
      guestProfileId = profile.id;
    } catch (err) {
      logger.error('[Shared Tour] Failed to find/create guest profile', { error: err });
    }
  }

  // Create primary guest on proposal
  const primaryGuest = await tripProposalService.addGuest(proposalId, {
    name: ticket.customer_name,
    email: ticket.customer_email || undefined,
    phone: ticket.customer_phone || undefined,
    is_primary: false,
    dietary_restrictions: ticket.dietary_restrictions || undefined,
  });

  // Link shared_tour_ticket_id and guest_profile_id on the primary guest
  await query(
    `UPDATE trip_proposal_guests
     SET shared_tour_ticket_id = $1${guestProfileId ? ', guest_profile_id = $3' : ''}
     WHERE id = $2`,
    guestProfileId
      ? [ticket.id, primaryGuest.id, guestProfileId]
      : [ticket.id, primaryGuest.id]
  );

  logger.info('[Shared Tour] Created primary proposal guest from ticket', {
    ticketId: ticket.id,
    proposalId,
    guestId: primaryGuest.id,
    guestAccessToken: primaryGuest.guest_access_token,
  });

  // Create additional guests if any
  if (ticket.guest_names && ticket.guest_names.length > 0) {
    for (const guestName of ticket.guest_names) {
      if (!guestName) continue;
      try {
        const additionalGuest = await tripProposalService.addGuest(proposalId, {
          name: guestName,
          is_primary: false,
        });
        // Link shared_tour_ticket_id on additional guest
        await query(
          'UPDATE trip_proposal_guests SET shared_tour_ticket_id = $1 WHERE id = $2',
          [ticket.id, additionalGuest.id]
        );
        logger.info('[Shared Tour] Created additional proposal guest from ticket', {
          ticketId: ticket.id,
          proposalId,
          guestId: additionalGuest.id,
          guestName,
        });
      } catch (err) {
        logger.error('[Shared Tour] Failed to create additional proposal guest', {
          ticketId: ticket.id,
          guestName,
          error: err,
        });
      }
    }
  }

  return {
    proposalAccessToken: proposal.access_token,
    primaryGuestAccessToken: primaryGuest.guest_access_token,
  };
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

  const proposal = await prisma.trip_proposals.findUnique({
    where: { id: tripProposalId },
    select: { id: true, deposit_paid: true, proposal_number: true },
  });

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

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.trip_proposals.updateMany({
      where: { id: tripProposalId, deposit_paid: false },
      data: { deposit_paid: true, deposit_paid_at: new Date(), updated_at: new Date() },
    });

    if (updateResult.count === 0) return;

    // payments table — trip_proposal_id column may not be in Prisma schema, use raw SQL
    await tx.$executeRaw`
      INSERT INTO payments (
        trip_proposal_id, amount, payment_type,
        stripe_payment_intent_id, status, created_at
      ) VALUES (${tripProposalId}, ${amount / 100}, 'trip_proposal_deposit', ${id}, 'succeeded', NOW())
      ON CONFLICT DO NOTHING
    `;
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
