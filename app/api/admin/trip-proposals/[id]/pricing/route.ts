/**
 * Trip Proposal Pricing API Routes
 * POST /api/admin/trip-proposals/[id]/pricing - Calculate/recalculate pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/pricing
 * Calculate and update the proposal pricing
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

  const pricing = await tripProposalService.calculatePricing(proposalId);

  return NextResponse.json({
    success: true,
    data: pricing,
    message: 'Pricing calculated successfully',
  });
});
