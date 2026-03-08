'use server';

/**
 * Guest-Facing Mutation Actions (Server Actions)
 *
 * Pattern: Zod schema → validate → Prisma mutation → return result
 *
 * These actions handle guest self-registration, profile updates,
 * deposit payment recording, and announcement preferences.
 *
 * Tables that are @@ignore in Prisma (guest_payments) use
 * prisma.$queryRawUnsafe() with parameterized queries.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  JoinTripSchema,
  RegisterGuestSchema,
  UpdateGuestDetailsSchema,
  ConfirmPaymentSchema,
  UpdateAnnouncementPrefsSchema,
  type JoinTripInput,
  type RegisterGuestInput,
  type UpdateGuestDetailsInput,
  type ConfirmPaymentInput,
  type UpdateAnnouncementPrefsInput,
} from '@/lib/schemas/guest';
import { getProposalByAccessToken } from './guest-queries';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ─── Join Trip (Self-Registration) ────────────────────────────────────────────

/**
 * Register a new guest via the shareable join link.
 * Validates capacity, duplicate emails, and approval settings.
 */
export async function joinTripAction(
  accessToken: string,
  input: JoinTripInput
): Promise<ActionResult<{
  guest_access_token: string | null;
  rsvp_status: string;
  needs_approval: boolean;
  registration_deposit_amount: number | null;
}>> {
  // Validate input
  const parseResult = JoinTripSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid input',
      fieldErrors: parseResult.error.flatten().fieldErrors,
    };
  }

  const { name, email, phone } = parseResult.data;

  // Look up proposal
  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  // Check can join
  const canJoin =
    ['accepted', 'booked'].includes(proposal.status ?? '') ||
    proposal.planning_phase !== 'proposal';

  if (!canJoin) {
    return { success: false, error: 'This trip is not accepting guests yet' };
  }

  // Check duplicate email (case-insensitive via raw query)
  const duplicates = await prisma.$queryRawUnsafe<{ id: number }[]>(
    'SELECT id FROM trip_proposal_guests WHERE trip_proposal_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1',
    proposal.id,
    email
  );

  if (duplicates.length > 0) {
    return {
      success: false,
      error: 'Unable to complete registration. If you have already registered, check your email for your trip details.',
    };
  }

  // Determine RSVP status based on approval setting
  const rsvpStatus = proposal.guest_approval_required ? 'pending' : 'confirmed';

  // Atomic capacity-checked insert using raw SQL (CTE prevents race conditions)
  const maxGuests = proposal.max_guests;
  const guests = await prisma.$queryRawUnsafe<
    { id: number; guest_access_token: string | null }[]
  >(
    `WITH capacity AS (
      SELECT COUNT(*) AS cnt FROM trip_proposal_guests WHERE trip_proposal_id = $1
    )
    INSERT INTO trip_proposal_guests (
      trip_proposal_id, name, email, phone, is_primary,
      is_registered, rsvp_status
    )
    SELECT $1, $2, $3, $4, false, true, $5
    FROM capacity
    WHERE $6::int IS NULL OR cnt < $6::int
    RETURNING id, guest_access_token`,
    proposal.id,
    name,
    email,
    phone || null,
    rsvpStatus,
    maxGuests
  );

  if (guests.length === 0) {
    return { success: false, error: 'This trip has reached maximum capacity' };
  }

  const guest = guests[0];

  return {
    success: true,
    data: {
      guest_access_token: guest.guest_access_token,
      rsvp_status: rsvpStatus,
      needs_approval: proposal.guest_approval_required ?? false,
      registration_deposit_amount: proposal.registration_deposit_amount
        ? Number(proposal.registration_deposit_amount)
        : null,
    },
  };
}

// ─── Guest Registration (existing guest updates their info) ───────────────────

/**
 * Update a pre-added guest's registration info (name, email, phone).
 */
export async function registerGuestAction(
  accessToken: string,
  guestId: number,
  input: RegisterGuestInput
): Promise<ActionResult> {
  const parseResult = RegisterGuestSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid registration data',
      fieldErrors: parseResult.error.flatten().fieldErrors,
    };
  }

  const { name, email, phone } = parseResult.data;

  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  const updated = await prisma.trip_proposal_guests.updateMany({
    where: {
      id: guestId,
      trip_proposal_id: proposal.id,
    },
    data: {
      name,
      email,
      phone: phone || null,
      is_registered: true,
      updated_at: new Date(),
    },
  });

  if (updated.count === 0) {
    return { success: false, error: 'Guest not found' };
  }

  // Re-fetch the updated guest to return
  const guest = await prisma.trip_proposal_guests.findFirst({
    where: { id: guestId, trip_proposal_id: proposal.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_registered: true,
      is_primary: true,
      dietary_restrictions: true,
      accessibility_needs: true,
      special_requests: true,
    },
  });

  return { success: true, data: guest };
}

// ─── Update Guest Details (dietary, accessibility, requests) ──────────────────

/**
 * Update a guest's dietary/accessibility/special request info.
 * Only allowed during active_planning phase.
 */
export async function updateGuestDetailsAction(
  accessToken: string,
  guestId: number,
  input: UpdateGuestDetailsInput
): Promise<ActionResult> {
  const parseResult = UpdateGuestDetailsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid input',
      fieldErrors: parseResult.error.flatten().fieldErrors,
    };
  }

  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  if (proposal.planning_phase !== 'active_planning') {
    return {
      success: false,
      error: 'Guest updates are not available at this time',
    };
  }

  // Build update data, only including fields that were provided
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  const { dietary_restrictions, accessibility_needs, special_requests } =
    parseResult.data;

  if (dietary_restrictions !== undefined) {
    updateData.dietary_restrictions = dietary_restrictions || null;
  }
  if (accessibility_needs !== undefined) {
    updateData.accessibility_needs = accessibility_needs || null;
  }
  if (special_requests !== undefined) {
    updateData.special_requests = special_requests || null;
  }

  const updated = await prisma.trip_proposal_guests.updateMany({
    where: {
      id: guestId,
      trip_proposal_id: proposal.id,
    },
    data: updateData,
  });

  if (updated.count === 0) {
    return { success: false, error: 'Guest not found' };
  }

  const guest = await prisma.trip_proposal_guests.findFirst({
    where: { id: guestId, trip_proposal_id: proposal.id },
    select: {
      id: true,
      name: true,
      dietary_restrictions: true,
      accessibility_needs: true,
      special_requests: true,
    },
  });

  return { success: true, data: guest };
}

// ─── Confirm Registration Deposit Payment ─────────────────────────────────────

/**
 * Record a confirmed registration deposit payment.
 * Verifies with Stripe, inserts into guest_payments (@@ignore — raw SQL),
 * and updates guest payment_status.
 *
 * Note: Stripe API calls are kept as-is; only DB queries are migrated to Prisma.
 */
export async function confirmRegistrationDepositAction(
  accessToken: string,
  input: ConfirmPaymentInput
): Promise<ActionResult> {
  const parseResult = ConfirmPaymentSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid request' };
  }

  const { payment_intent_id, guest_access_token } = parseResult.data;
  if (!guest_access_token) {
    return { success: false, error: 'guest_access_token is required' };
  }

  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  // Look up guest using Prisma
  const guest = await prisma.trip_proposal_guests.findFirst({
    where: {
      trip_proposal_id: proposal.id,
      guest_access_token: guest_access_token,
    },
    select: {
      id: true,
      name: true,
      email: true,
      payment_status: true,
    },
  });

  if (!guest) {
    return { success: false, error: 'Guest not found' };
  }

  // Get brand-specific Stripe client
  const { getBrandStripeClient } = await import('@/lib/stripe-brands');
  const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
  if (!stripe) {
    logger.error('[Registration Payment] Stripe not configured', {
      brandId: proposal.brand_id,
    });
    return { success: false, error: 'Payment service not configured' };
  }

  // Verify payment with Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
  if (paymentIntent.status !== 'succeeded') {
    return {
      success: false,
      error: `Payment has not succeeded. Current status: ${paymentIntent.status}`,
    };
  }

  // Verify metadata
  if (paymentIntent.metadata.payment_type !== 'registration_deposit') {
    return { success: false, error: 'Payment type mismatch' };
  }
  if (paymentIntent.metadata.trip_proposal_id !== proposal.id.toString()) {
    return { success: false, error: 'Payment does not match this trip' };
  }

  const amount = paymentIntent.amount / 100;

  // Atomic idempotency: INSERT ... ON CONFLICT DO NOTHING (guest_payments is @@ignore)
  const insertResult = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status)
     VALUES ($1, $2, $3, $4, 'registration_deposit', 'succeeded')
     ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
     DO NOTHING
     RETURNING id`,
    proposal.id,
    guest.id,
    amount,
    payment_intent_id
  );

  if (insertResult.length === 0) {
    // Already processed — idempotent success
    return {
      success: true,
      data: {
        already_processed: true,
        guest_name: guest.name,
        portal_url: `/my-trip/${accessToken}?guest=${guest_access_token}`,
      },
    };
  }

  // Update guest payment status (use raw SQL for COALESCE arithmetic on Decimal)
  await prisma.$queryRawUnsafe(
    `UPDATE trip_proposal_guests
     SET payment_status = 'paid',
         amount_paid = COALESCE(amount_paid, 0) + $1,
         payment_paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $2 AND trip_proposal_id = $3`,
    amount,
    guest.id,
    proposal.id
  );

  return {
    success: true,
    data: {
      guest_name: guest.name,
      amount_paid: amount,
      payment_intent_id: paymentIntent.id,
      portal_url: `/my-trip/${accessToken}?guest=${guest_access_token}`,
    },
  };
}

// ─── Confirm Guest Share Payment ──────────────────────────────────────────────

/**
 * Record a confirmed guest share payment (individual billing).
 * Similar to deposit but for the guest's portion of the trip cost.
 */
export async function confirmGuestSharePaymentAction(
  accessToken: string,
  guestToken: string,
  paymentIntentId: string
): Promise<ActionResult> {
  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  const guest = await prisma.trip_proposal_guests.findFirst({
    where: {
      trip_proposal_id: proposal.id,
      guest_access_token: guestToken,
    },
    select: {
      id: true,
      name: true,
      amount_owed: true,
      amount_paid: true,
      payment_status: true,
    },
  });

  if (!guest) {
    return { success: false, error: 'Guest not found' };
  }

  // Verify with Stripe
  const { getBrandStripeClient } = await import('@/lib/stripe-brands');
  const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
  if (!stripe) {
    return { success: false, error: 'Payment service not configured' };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== 'succeeded') {
    return {
      success: false,
      error: `Payment not yet confirmed (status: ${paymentIntent.status})`,
    };
  }

  const amount = paymentIntent.amount / 100;

  // Atomic idempotency via guest_payments (@@ignore — raw SQL)
  const insertResult = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status)
     VALUES ($1, $2, $3, $4, 'guest_share', 'succeeded')
     ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
     DO NOTHING
     RETURNING id`,
    proposal.id,
    guest.id,
    amount,
    paymentIntentId
  );

  if (insertResult.length === 0) {
    return {
      success: true,
      data: { already_processed: true, guest_name: guest.name },
    };
  }

  // Calculate new payment status
  const newPaid = (Number(guest.amount_paid) || 0) + amount;
  const owed = Number(guest.amount_owed) || 0;
  const status = newPaid >= owed ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

  await prisma.trip_proposal_guests.update({
    where: { id: guest.id },
    data: {
      amount_paid: newPaid,
      payment_status: status,
      payment_paid_at: status === 'paid' ? new Date() : undefined,
      updated_at: new Date(),
    },
  });

  return {
    success: true,
    data: {
      guest_name: guest.name,
      amount_paid: amount,
      payment_intent_id: paymentIntentId,
    },
  };
}

// ─── Update Announcement Preferences ──────────────────────────────────────────

/**
 * Update a guest's notification/announcement preferences.
 * Uses raw SQL since guest_announcement_preferences may not be in Prisma.
 */
export async function updateAnnouncementPrefsAction(
  accessToken: string,
  guestId: number,
  input: UpdateAnnouncementPrefsInput
): Promise<ActionResult> {
  const parseResult = UpdateAnnouncementPrefsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid preferences',
      fieldErrors: parseResult.error.flatten().fieldErrors,
    };
  }

  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) {
    return { success: false, error: 'Trip not found' };
  }

  // Verify guest belongs to this proposal
  const guest = await prisma.trip_proposal_guests.findFirst({
    where: {
      id: guestId,
      trip_proposal_id: proposal.id,
    },
    select: { id: true },
  });

  if (!guest) {
    return { success: false, error: 'Guest not found' };
  }

  const { email_enabled, sms_enabled, push_enabled } = parseResult.data;

  // Upsert announcement preferences (table may not be in Prisma — use raw SQL)
  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO guest_announcement_preferences (guest_id, trip_proposal_id, email_enabled, sms_enabled, push_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (guest_id, trip_proposal_id)
       DO UPDATE SET
         email_enabled = COALESCE($3, guest_announcement_preferences.email_enabled),
         sms_enabled = COALESCE($4, guest_announcement_preferences.sms_enabled),
         push_enabled = COALESCE($5, guest_announcement_preferences.push_enabled),
         updated_at = NOW()`,
      guestId,
      proposal.id,
      email_enabled ?? true,
      sms_enabled ?? false,
      push_enabled ?? false
    );
  } catch (error) {
    // Table may not exist yet — log and return graceful error
    logger.warn('[Guest Actions] Announcement preferences table may not exist', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Announcement preferences are not available for this trip',
    };
  }

  return { success: true, data: { updated: true } };
}

// ─── Mark Proposal as Viewed ──────────────────────────────────────────────────

/**
 * Increment view count or mark as viewed (first-time).
 * Called from the /my-trip/[token] page load.
 */
export async function markProposalViewedAction(
  proposalId: number,
  currentStatus: string,
  ipAddress: string
): Promise<void> {
  try {
    if (currentStatus === 'sent') {
      // First view — update status to 'viewed'
      await prisma.trip_proposals.update({
        where: { id: proposalId },
        data: {
          status: 'viewed',
          first_viewed_at: new Date(),
          last_viewed_at: new Date(),
          view_count: { increment: 1 },
          updated_at: new Date(),
        },
      });

      // Log activity (raw SQL since trip_proposal_activity may have specific columns)
      await prisma.$queryRawUnsafe(
        `INSERT INTO trip_proposal_activity (trip_proposal_id, action, description, actor_type, ip_address, created_at)
         VALUES ($1, 'viewed', 'Proposal first viewed by customer', 'customer', $2, NOW())`,
        proposalId,
        ipAddress
      );
    } else if (currentStatus === 'viewed') {
      // Subsequent view — just increment
      await prisma.trip_proposals.update({
        where: { id: proposalId },
        data: {
          view_count: { increment: 1 },
          last_viewed_at: new Date(),
        },
      });
    }
  } catch (error) {
    logger.error('[Guest Actions] Failed to mark proposal viewed', {
      error: error instanceof Error ? error.message : String(error),
      proposalId,
    });
  }
}
