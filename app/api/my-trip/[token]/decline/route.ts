/**
 * Client-Facing Decline API
 * POST /api/my-trip/[token]/decline
 * Allows clients to decline a proposal via their access token
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

    // Only allow declining proposals that are sent or viewed
    if (!['sent', 'viewed'].includes(proposal.status)) {
      return NextResponse.json(
        { success: false, error: 'This proposal cannot be declined at this time' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    await tripProposalService.updateStatus(proposal.id, 'declined', {
      actor_type: 'customer',
      ip_address: ip,
    });

    return NextResponse.json({
      success: true,
      message: 'Proposal declined',
    });
  }
);
