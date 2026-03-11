/**
 * Import Shared Tour Guests to Trip Proposal
 * POST /api/admin/shared-tours/[tour_id]/import-guests
 *
 * Takes all ticket holders from a shared tour and imports them
 * as trip_proposal_guests on the linked proposal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { guestProfileService } from '@/lib/services/guest-profile.service';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, _session, context) => {
    const { tour_id } = await (context as unknown as RouteParams).params;

    // Get the shared tour to find linked proposal
    const tourRows = await prisma.$queryRaw<{ id: string; trip_proposal_id: number | null }[]>`
      SELECT id, trip_proposal_id FROM shared_tours WHERE id = ${tour_id}
    `;

    const tour = tourRows[0];
    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Shared tour not found' },
        { status: 404 }
      );
    }

    if (!tour.trip_proposal_id) {
      return NextResponse.json(
        { success: false, error: 'This shared tour is not linked to a trip proposal. Set trip_proposal_id first.' },
        { status: 400 }
      );
    }

    // Verify the proposal exists
    const proposal = await tripProposalService.getById(tour.trip_proposal_id);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Linked trip proposal not found' },
        { status: 404 }
      );
    }

    // Get all tickets for the tour
    const tickets = await sharedTourService.getTicketsForTour(tour_id);

    let importedCount = 0;
    let skippedCount = 0;

    for (const ticket of tickets) {
      if (!ticket.customer_email) {
        skippedCount++;
        continue;
      }

      // Check if guest already exists on proposal
      const alreadyExists = await tripProposalService.isEmailRegistered(
        tour.trip_proposal_id,
        ticket.customer_email
      );

      if (alreadyExists) {
        skippedCount++;
        continue;
      }

      // Find or create guest profile
      let guestProfileId: number | undefined;
      try {
        const profile = await guestProfileService.findOrCreateByEmail(
          ticket.customer_email,
          { name: ticket.customer_name, phone: ticket.customer_phone }
        );
        guestProfileId = profile.id;

        // Link profile to ticket if not already linked
        if (!ticket.guest_profile_id) {
          await sharedTourService.linkGuestProfile(ticket.id, profile.id);
        }
      } catch (err) {
        logger.error('Failed to create guest profile during import', { error: err });
      }

      // Add as proposal guest
      await tripProposalService.addGuest(tour.trip_proposal_id, {
        name: ticket.customer_name,
        email: ticket.customer_email,
        phone: ticket.customer_phone || undefined,
        is_primary: false,
        dietary_restrictions: ticket.dietary_restrictions || undefined,
      });

      // If we have a guest profile, link it to the newly created proposal guest
      if (guestProfileId) {
        try {
          await prisma.$executeRaw`
            UPDATE trip_proposal_guests
            SET guest_profile_id = ${guestProfileId}
            WHERE trip_proposal_id = ${tour.trip_proposal_id} AND LOWER(email) = LOWER(${ticket.customer_email})
          `;
        } catch (err) {
          logger.error('Failed to link guest profile to proposal guest', { error: err });
        }
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        total_tickets: tickets.length,
      },
    });
  });
