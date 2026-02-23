/**
 * Client-Facing Accept API
 * POST /api/my-trip/[token]/accept
 * Allows clients to accept a proposal via their access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  token: string;
}

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Only allow accepting proposals that are sent or viewed
    if (!['sent', 'viewed'].includes(proposal.status)) {
      return NextResponse.json(
        { success: false, error: 'This proposal cannot be accepted at this time' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    await tripProposalService.updateStatus(proposal.id, 'accepted', {
      actor_type: 'customer',
      ip_address: ip,
    });

    // Check the per-proposal toggle to determine next action
    if (proposal.skip_deposit_on_accept) {
      // Big custom trips: skip deposit, unlock planning tools immediately
      await tripProposalService.updatePlanningPhase(proposal.id, 'active_planning');
      return NextResponse.json({
        success: true,
        action: 'planning_unlocked',
      });
    }

    // Default: deposit required before planning begins
    return NextResponse.json({
      success: true,
      action: 'deposit_required',
    });
  }
);
