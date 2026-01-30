/**
 * Trip Proposal Guests API Routes
 * GET /api/admin/trip-proposals/[id]/guests - List guests
 * POST /api/admin/trip-proposals/[id]/guests - Add a guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { AddGuestSchema } from '@/lib/types/trip-proposal';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/guests
 * Add a new guest to the proposal
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

  const body = await request.json();

  const parseResult = AddGuestSchema.safeParse(body);
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

  const guest = await tripProposalService.addGuest(proposalId, parseResult.data);

  return NextResponse.json(
    {
      success: true,
      data: guest,
      message: 'Guest added successfully',
    },
    { status: 201 }
  );
});
