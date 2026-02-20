/**
 * Client-Facing Trip Proposal API Routes
 * GET /api/trip-proposals/[proposalNumber] - View proposal (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  proposalNumber: string;
}

/**
 * GET /api/trip-proposals/[proposalNumber]
 * Public route for clients to view their proposal
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { proposalNumber } = await context.params;

    if (!proposalNumber || !proposalNumber.startsWith('TP-')) {
      return NextResponse.json(
        { success: false, error: 'Invalid proposal number' },
        { status: 400 }
      );
    }

    const proposal = await tripProposalService.getByNumber(proposalNumber);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Only allow viewing of sent/viewed/accepted proposals
    if (!['sent', 'viewed', 'accepted'].includes(proposal.status)) {
      return NextResponse.json(
        { success: false, error: 'Proposal not available' },
        { status: 404 }
      );
    }

    // Get full details
    const fullProposal = await tripProposalService.getFullDetails(proposal.id);

    // Mark as viewed if sent
    if (proposal.status === 'sent') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

      await tripProposalService.updateStatus(proposal.id, 'viewed', {
        actor_type: 'customer',
        ip_address: ip,
      });
    } else if (proposal.status === 'viewed') {
      // Increment view count
      const { query } = await import('@/lib/db');
      await query(
        'UPDATE trip_proposals SET view_count = view_count + 1, last_viewed_at = NOW() WHERE id = $1',
        [proposal.id]
      );
    }

    // Remove internal notes from response
    if (fullProposal) {
      fullProposal.internal_notes = null;
      if (fullProposal.days) {
        fullProposal.days = fullProposal.days.map((day) => ({
          ...day,
          internal_notes: null,
          stops: day.stops?.map((stop) => ({
            ...stop,
            internal_notes: null,
            driver_notes: null,
          })),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: fullProposal,
    });
  }
);
