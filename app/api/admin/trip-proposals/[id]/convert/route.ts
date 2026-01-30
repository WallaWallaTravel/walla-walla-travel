/**
 * Trip Proposal Convert to Booking API Routes
 * POST /api/admin/trip-proposals/[id]/convert - Convert accepted proposal to booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/convert
 * Convert an accepted trip proposal to a booking
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

  const result = await tripProposalService.convertToBooking(
    proposalId,
    session?.userId ? parseInt(session.userId, 10) : undefined
  );

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Trip proposal converted to booking successfully',
  });
});
