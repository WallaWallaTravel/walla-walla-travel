'use server';

/**
 * Guest-Facing Read Queries (Server Actions)
 *
 * All queries use Prisma with `select` to fetch only needed fields.
 * Public pages call these directly — no auth required for reads,
 * but mutations validate via access tokens.
 *
 * Tables that are @@ignore in Prisma (guest_payments, proposal_lunch_orders,
 * lunch_menu_items) use prisma.$queryRawUnsafe() with parameterized queries.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ─── Trip Proposal Lookups ────────────────────────────────────────────────────

/**
 * Get a trip proposal by its access_token (for /my-trip/[token] routes).
 * Returns only the fields needed for guest-facing pages.
 */
export async function getProposalByAccessToken(accessToken: string) {
  if (!accessToken || accessToken.length < 32) return null;

  return prisma.trip_proposals.findFirst({
    where: { access_token: accessToken },
    select: {
      id: true,
      proposal_number: true,
      status: true,
      customer_name: true,
      customer_email: true,
      trip_title: true,
      trip_type: true,
      party_size: true,
      start_date: true,
      end_date: true,
      total: true,
      deposit_amount: true,
      deposit_paid: true,
      brand_id: true,
      access_token: true,
      planning_phase: true,
      max_guests: true,
      min_guests: true,
      dynamic_pricing_enabled: true,
      guest_approval_required: true,
      show_guest_count_to_guests: true,
      individual_billing_enabled: true,
      payment_deadline: true,
      registration_deposit_amount: true,
      registration_deposit_type: true,
      introduction: true,
      special_notes: true,
      valid_until: true,
      first_viewed_at: true,
      view_count: true,
    },
  });
}

/**
 * Get full proposal details for the guest portal (itinerary view).
 * Includes days, stops, guests, and inclusions — strips internal notes.
 */
export async function getProposalFullDetails(proposalId: number) {
  const proposal = await prisma.trip_proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      proposal_number: true,
      status: true,
      customer_name: true,
      customer_email: true,
      customer_phone: true,
      trip_title: true,
      trip_type: true,
      party_size: true,
      start_date: true,
      end_date: true,
      subtotal: true,
      discount_amount: true,
      discount_percentage: true,
      taxes: true,
      tax_rate: true,
      gratuity_percentage: true,
      gratuity_amount: true,
      total: true,
      deposit_percentage: true,
      deposit_amount: true,
      deposit_paid: true,
      balance_due: true,
      brand_id: true,
      introduction: true,
      special_notes: true,
      access_token: true,
      planning_phase: true,
      max_guests: true,
      min_guests: true,
      individual_billing_enabled: true,
      payment_deadline: true,
      valid_until: true,
      accepted_at: true,
      sent_at: true,
      trip_proposal_days: {
        select: {
          id: true,
          day_number: true,
          date: true,
          title: true,
          description: true,
          trip_proposal_stops: {
            select: {
              id: true,
              stop_order: true,
              stop_type: true,
              custom_name: true,
              custom_address: true,
              custom_description: true,
              scheduled_time: true,
              duration_minutes: true,
              cost_note: true,
              client_notes: true,
              reservation_status: true,
              winery_id: true,
              restaurant_id: true,
              hotel_id: true,
              wineries: {
                select: { id: true, name: true, address: true },
              },
              restaurants: {
                select: { id: true, name: true, address: true },
              },
              hotels: {
                select: { id: true, name: true, address: true },
              },
            },
            orderBy: { stop_order: 'asc' },
          },
        },
        orderBy: { day_number: 'asc' },
      },
      trip_proposal_guests: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_primary: true,
          dietary_restrictions: true,
          accessibility_needs: true,
          special_requests: true,
          rsvp_status: true,
          is_registered: true,
          payment_status: true,
          amount_owed: true,
          amount_paid: true,
          is_sponsored: true,
          guest_access_token: true,
        },
        orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
      },
      trip_proposal_inclusions: {
        where: { show_on_proposal: true },
        select: {
          id: true,
          inclusion_type: true,
          description: true,
          quantity: true,
          unit: true,
          unit_price: true,
          total_price: true,
          sort_order: true,
          notes: true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  return proposal;
}

// ─── Guest Lookups ────────────────────────────────────────────────────────────

/**
 * Get guest count for a proposal (for capacity checks).
 */
export async function getGuestCount(proposalId: number): Promise<number> {
  return prisma.trip_proposal_guests.count({
    where: { trip_proposal_id: proposalId },
  });
}

/**
 * Check if an email is already registered for a proposal (case-insensitive).
 */
export async function isEmailRegistered(
  proposalId: number,
  email: string
): Promise<boolean> {
  // Prisma doesn't support case-insensitive comparisons natively on all DBs,
  // so we use a raw query for the LOWER() comparison
  const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
    'SELECT id FROM trip_proposal_guests WHERE trip_proposal_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1',
    proposalId,
    email
  );
  return result.length > 0;
}

/**
 * Resolve a guest by their guest_access_token within a proposal.
 */
export async function resolveGuestByToken(
  proposalId: number,
  guestToken: string
) {
  return prisma.trip_proposal_guests.findFirst({
    where: {
      trip_proposal_id: proposalId,
      guest_access_token: guestToken,
    },
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
      rsvp_status: true,
      payment_status: true,
      amount_owed: true,
      amount_paid: true,
      is_sponsored: true,
      payment_group_id: true,
    },
  });
}

/**
 * Get per-person estimate for dynamic pricing display.
 */
export async function getPerPersonEstimate(proposalId: number) {
  const proposal = await prisma.trip_proposals.findUnique({
    where: { id: proposalId },
    select: {
      total: true,
      min_guests: true,
      max_guests: true,
    },
  });

  if (!proposal) {
    return {
      current_per_person: 0,
      ceiling_price: 0,
      floor_price: 0,
      min_guests: null as number | null,
      max_guests: null as number | null,
    };
  }

  const guestCount = await getGuestCount(proposalId);
  const total = Number(proposal.total) || 0;
  const minGuests = Math.max(1, proposal.min_guests || guestCount || 1);
  const maxGuests = Math.max(1, proposal.max_guests || guestCount || 1);

  const currentPerPerson = guestCount > 0 ? total / guestCount : total;
  const ceilingPrice = total / minGuests;
  const floorPrice = total / maxGuests;

  return {
    current_per_person: Number.isFinite(currentPerPerson) ? currentPerPerson : 0,
    ceiling_price: Number.isFinite(ceilingPrice) ? ceilingPrice : 0,
    floor_price: Number.isFinite(floorPrice) ? floorPrice : 0,
    min_guests: proposal.min_guests,
    max_guests: proposal.max_guests,
  };
}

// ─── Payment Queries (guest_payments is @@ignore — use raw SQL) ───────────────

/**
 * Get payment history for a guest (guest_payments table is @@ignore).
 */
export async function getGuestPayments(guestId: number) {
  return prisma.$queryRawUnsafe<
    {
      id: number;
      amount: number;
      payment_type: string;
      status: string;
      created_at: Date;
    }[]
  >(
    `SELECT id, amount, payment_type, status, created_at
     FROM guest_payments
     WHERE guest_id = $1 AND status = 'succeeded'
     ORDER BY created_at DESC`,
    guestId
  );
}

/**
 * Get guest payment status summary.
 */
export async function getGuestPaymentStatus(
  proposalAccessToken: string,
  guestAccessToken: string
) {
  const proposal = await getProposalByAccessToken(proposalAccessToken);
  if (!proposal) return null;

  const guest = await resolveGuestByToken(proposal.id, guestAccessToken);
  if (!guest) return null;

  const payments = await getGuestPayments(guest.id);

  const amountOwed = Number(guest.amount_owed) || 0;
  const amountPaid = Number(guest.amount_paid) || 0;

  return {
    guest_name: guest.name,
    amount_owed: amountOwed,
    amount_paid: amountPaid,
    amount_remaining: Math.max(0, amountOwed - amountPaid),
    payment_status: guest.payment_status,
    is_sponsored: guest.is_sponsored,
    payment_deadline: proposal.payment_deadline,
    proposal_number: proposal.proposal_number,
    trip_title: proposal.trip_title,
    payments,
  };
}

// ─── Lunch Order Queries (proposal_lunch_orders is not in Prisma) ─────────────

/**
 * Get lunch orders for a proposal (uses raw SQL — table not in Prisma).
 */
export async function getLunchOrdersForProposal(proposalId: number) {
  try {
    return await prisma.$queryRawUnsafe<
      {
        id: number;
        supplier_id: number;
        status: string;
        ordering_mode: string;
        guest_orders: unknown;
        order_deadline: Date | null;
        trip_proposal_id: number;
      }[]
    >(
      `SELECT id, supplier_id, status, ordering_mode, guest_orders, order_deadline, trip_proposal_id
       FROM proposal_lunch_orders
       WHERE trip_proposal_id = $1
       ORDER BY created_at ASC`,
      proposalId
    );
  } catch (error) {
    logger.error('[Guest Queries] Failed to load lunch orders', {
      error: error instanceof Error ? error.message : String(error),
      proposalId,
    });
    return [];
  }
}

// ─── Trip Info for Join Page ──────────────────────────────────────────────────

/**
 * Get trip info specifically for the join/registration page.
 * Minimal data — only what the join form needs.
 */
export async function getTripInfoForJoin(accessToken: string) {
  const proposal = await getProposalByAccessToken(accessToken);
  if (!proposal) return null;

  const canJoin =
    ['accepted', 'booked'].includes(proposal.status ?? '') ||
    proposal.planning_phase !== 'proposal';

  if (!canJoin) return null;

  const guestCount = await getGuestCount(proposal.id);
  const atCapacity = proposal.max_guests
    ? guestCount >= proposal.max_guests
    : false;

  const data: Record<string, unknown> = {
    proposal_id: proposal.id,
    trip_title: proposal.trip_title || `Trip for ${proposal.customer_name}`,
    start_date: proposal.start_date,
    end_date: proposal.end_date,
    at_capacity: atCapacity,
    max_guests: proposal.max_guests,
    registration_deposit_amount: proposal.registration_deposit_amount
      ? Number(proposal.registration_deposit_amount)
      : null,
    registration_deposit_type: proposal.registration_deposit_type || null,
    guest_approval_required: proposal.guest_approval_required,
  };

  if (proposal.show_guest_count_to_guests) {
    data.guest_count = guestCount;
    data.min_guests = proposal.min_guests;
    data.spots_remaining = proposal.max_guests
      ? proposal.max_guests - guestCount
      : null;
  }

  if (proposal.dynamic_pricing_enabled && proposal.show_guest_count_to_guests) {
    data.dynamic_pricing = await getPerPersonEstimate(proposal.id);
  }

  return data;
}
