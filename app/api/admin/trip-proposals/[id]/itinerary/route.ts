/**
 * Trip Proposal Driver Itinerary Generation API Routes
 * POST /api/admin/trip-proposals/[id]/itinerary - Generate driver itinerary
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/itinerary
 * Generate a driver itinerary from a converted trip proposal
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

  const result = await tripProposalService.generateDriverItinerary(proposalId);

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Driver itinerary generated successfully',
  });
});
