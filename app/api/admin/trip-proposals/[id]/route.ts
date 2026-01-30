/**
 * Individual Trip Proposal API Routes
 * GET /api/admin/trip-proposals/[id] - Get full proposal details
 * PATCH /api/admin/trip-proposals/[id] - Update proposal
 * DELETE /api/admin/trip-proposals/[id] - Delete proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { UpdateTripProposalSchema } from '@/lib/types/trip-proposal';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/trip-proposals/[id]
 * Get full trip proposal details with all relations
 */
export const GET = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  const proposal = await tripProposalService.getFullDetails(proposalId);

  if (!proposal) {
    return NextResponse.json(
      { success: false, error: 'Trip proposal not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: proposal,
  });
});

/**
 * PATCH /api/admin/trip-proposals/[id]
 * Update trip proposal
 */
export const PATCH = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = UpdateTripProposalSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const proposal = await tripProposalService.updateProposal(
    proposalId,
    parseResult.data
  );

  return NextResponse.json({
    success: true,
    data: proposal,
    message: 'Trip proposal updated successfully',
  });
});

/**
 * DELETE /api/admin/trip-proposals/[id]
 * Delete trip proposal (only drafts can be deleted)
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

  // Get proposal to check status
  const proposal = await tripProposalService.getById(proposalId);

  if (!proposal) {
    return NextResponse.json(
      { success: false, error: 'Trip proposal not found' },
      { status: 404 }
    );
  }

  if (proposal.status !== 'draft') {
    return NextResponse.json(
      {
        success: false,
        error: 'Only draft proposals can be deleted',
      },
      { status: 400 }
    );
  }

  // Cascade delete will handle days, stops, guests, inclusions, activity
  const { query } = await import('@/lib/db');
  await query('DELETE FROM trip_proposals WHERE id = $1', [proposalId]);

  return NextResponse.json({
    success: true,
    message: 'Trip proposal deleted successfully',
  });
});
