/**
 * Guest Self-Registration API
 * POST /api/my-trip/[token]/join - Register as a guest via shareable link
 * GET /api/my-trip/[token]/join - Get trip info for the join page
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { query } from '@/lib/db-helpers';
import { z } from 'zod';

interface RouteParams {
  token: string;
}

const JoinGuestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Valid email required'),
  phone: z.string().max(50).optional().or(z.literal('')),
});

/**
 * GET /api/my-trip/[token]/join
 * Returns trip info for the registration page (public)
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    if (!token || token.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token' },
        { status: 404 }
      );
    }

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Only allow joining accepted/booked trips or those in active planning
    const canJoin = ['accepted', 'booked'].includes(proposal.status) ||
      proposal.planning_phase !== 'proposal';

    if (!canJoin) {
      return NextResponse.json(
        { success: false, error: 'This trip is not accepting guests yet' },
        { status: 403 }
      );
    }

    const guestCount = await tripProposalService.getGuestCount(proposal.id);
    const atCapacity = proposal.max_guests ? guestCount >= proposal.max_guests : false;

    // Build response — only show counts if configured
    const data: Record<string, unknown> = {
      trip_title: proposal.trip_title || `Trip for ${proposal.customer_name}`,
      start_date: proposal.start_date,
      end_date: proposal.end_date,
      at_capacity: atCapacity,
      max_guests: proposal.max_guests,
    };

    if (proposal.show_guest_count_to_guests) {
      data.guest_count = guestCount;
      data.min_guests = proposal.min_guests;
      data.spots_remaining = proposal.max_guests ? proposal.max_guests - guestCount : null;
    }

    // Dynamic pricing info
    if (proposal.dynamic_pricing_enabled && proposal.show_guest_count_to_guests) {
      const estimate = await tripProposalService.getPerPersonEstimate(proposal.id);
      data.dynamic_pricing = {
        current_per_person: estimate.current_per_person,
        ceiling_price: estimate.ceiling_price,
        floor_price: estimate.floor_price,
        min_guests: estimate.min_guests,
        max_guests: estimate.max_guests,
      };
    }

    return NextResponse.json({ success: true, data });
  }
);

/**
 * POST /api/my-trip/[token]/join
 * Register a new guest via the shareable link
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    if (!token || token.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token' },
        { status: 404 }
      );
    }

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Only allow joining accepted/booked trips or those in active planning
    const canJoin = ['accepted', 'booked'].includes(proposal.status) ||
      proposal.planning_phase !== 'proposal';

    if (!canJoin) {
      return NextResponse.json(
        { success: false, error: 'This trip is not accepting guests yet' },
        { status: 403 }
      );
    }

    // Check capacity
    if (proposal.max_guests) {
      const guestCount = await tripProposalService.getGuestCount(proposal.id);
      if (guestCount >= proposal.max_guests) {
        return NextResponse.json(
          { success: false, error: 'Trip is full — no more spots available' },
          { status: 409 }
        );
      }
    }

    const body = await request.json();
    const parseResult = JoinGuestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone } = parseResult.data;

    // Check for duplicate email (per-trip)
    const existingGuests = await tripProposalService.getFullDetails(proposal.id);
    const duplicate = existingGuests?.guests?.find(
      (g) => g.email && g.email.toLowerCase() === email.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'A guest with this email is already registered for this trip' },
        { status: 409 }
      );
    }

    // Determine RSVP status based on approval setting
    const rsvpStatus = proposal.guest_approval_required ? 'pending' : 'confirmed';

    // Create the guest
    const guest = await tripProposalService.addGuest(proposal.id, {
      name,
      email,
      phone: phone || undefined,
    });

    // Update registration and RSVP fields directly since addGuest doesn't set these
    await query(
      `UPDATE trip_proposal_guests SET is_registered = true, rsvp_status = $1 WHERE id = $2`,
      [rsvpStatus, guest.id]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          guest_access_token: guest.guest_access_token,
          rsvp_status: rsvpStatus,
          needs_approval: proposal.guest_approval_required,
        },
        message: proposal.guest_approval_required
          ? 'Registration submitted — awaiting approval'
          : 'Successfully registered!',
      },
      { status: 201 }
    );
  }
);
