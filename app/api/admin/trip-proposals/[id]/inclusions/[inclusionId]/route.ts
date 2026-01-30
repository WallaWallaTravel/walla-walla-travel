/**
 * Individual Trip Proposal Inclusion API Routes
 * DELETE /api/admin/trip-proposals/[id]/inclusions/[inclusionId] - Delete inclusion
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string; inclusionId: string }>;
}

/**
 * DELETE /api/admin/trip-proposals/[id]/inclusions/[inclusionId]
 * Delete an inclusion
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { inclusionId } = await (context as unknown as RouteParams).params;
  const inclusionIdNum = parseInt(inclusionId, 10);

  if (isNaN(inclusionIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid inclusion ID' },
      { status: 400 }
    );
  }

  await tripProposalService.deleteInclusion(inclusionIdNum);

  return NextResponse.json({
    success: true,
    message: 'Inclusion deleted successfully',
  });
});
