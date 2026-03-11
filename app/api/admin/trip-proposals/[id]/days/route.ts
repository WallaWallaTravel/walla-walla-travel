/**
 * Trip Proposal Days API Routes
 * POST /api/admin/trip-proposals/[id]/days - Add a day to the proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { AddDaySchema } from '@/lib/types/trip-proposal';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-proposals/[id]/days
 * Add a new day to the trip proposal
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

  const parseResult = AddDaySchema.safeParse(body);
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

  const day = await tripProposalService.addDay(proposalId, parseResult.data);

  return NextResponse.json(
    {
      success: true,
      data: day,
      message: 'Day added successfully',
    },
    { status: 201 }
  );
});
