/**
 * Trip Proposal Duplicate API Routes
 * POST /api/admin/trip-proposals/[id]/duplicate - Duplicate a proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/duplicate
 * Create a copy of an existing trip proposal (useful for templates)
 */
export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  const newProposal = await tripProposalService.duplicate(
    proposalId,
    session?.userId ? parseInt(session.userId, 10) : undefined
  );

  return NextResponse.json(
    {
      success: true,
      data: newProposal,
      message: 'Trip proposal duplicated successfully',
    },
    { status: 201 }
  );
});
