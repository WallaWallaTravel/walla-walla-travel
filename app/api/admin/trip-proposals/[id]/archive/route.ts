/**
 * Trip Proposal Archive API
 * POST /api/admin/trip-proposals/[id]/archive - Archive proposal
 * DELETE /api/admin/trip-proposals/[id]/archive - Unarchive proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/archive
 * Archive a trip proposal
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

  const proposal = await tripProposalService.archiveProposal(proposalId);

  return NextResponse.json({
    success: true,
    data: proposal,
    message: 'Trip proposal archived successfully',
  });
});

/**
 * DELETE /api/admin/trip-proposals/[id]/archive
 * Unarchive a trip proposal
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  const proposal = await tripProposalService.unarchiveProposal(proposalId);

  return NextResponse.json({
    success: true,
    data: proposal,
    message: 'Trip proposal unarchived successfully',
  });
});
