/**
 * Individual Trip Proposal Guest API Routes
 * DELETE /api/admin/trip-proposals/[id]/guests/[guestId] - Delete guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

/**
 * DELETE /api/admin/trip-proposals/[id]/guests/[guestId]
 * Delete a guest
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { guestId } = await (context as unknown as RouteParams).params;
  const guestIdNum = parseInt(guestId, 10);

  if (isNaN(guestIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid guest ID' },
      { status: 400 }
    );
  }

  await tripProposalService.deleteGuest(guestIdNum);

  return NextResponse.json({
    success: true,
    message: 'Guest deleted successfully',
  });
});
