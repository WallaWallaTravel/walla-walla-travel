/**
 * Client-Facing My Trip API Routes
 * GET /api/my-trip/[token] - View proposal by access token (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  token: string;
}

/**
 * GET /api/my-trip/[token]
 * Public route for clients to view their trip via access token.
 * Returns full proposal data, stripped of internal notes.
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

    // Allow viewing of sent/viewed/accepted/converted proposals
    // Draft and expired proposals are not visible to clients
    if (['draft', 'expired', 'declined'].includes(proposal.status)) {
      return NextResponse.json(
        { success: false, error: 'Trip not available' },
        { status: 404 }
      );
    }

    // Get full details
    const fullProposal = await tripProposalService.getFullDetails(proposal.id);

    // Mark as viewed if sent (first time viewing)
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

    // Strip internal notes from response
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
      data: {
        ...fullProposal,
        planning_phase: proposal.planning_phase,
        access_token: proposal.access_token,
      },
    });
  }
);
