/**
 * Trip Proposal Status API Routes
 * PATCH /api/admin/trip-proposals/[id]/status - Update proposal status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { TRIP_PROPOSAL_STATUS } from '@/lib/types/trip-proposal';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateStatusSchema = z.object({
  status: z.enum(TRIP_PROPOSAL_STATUS),
  signature: z.string().optional(),
});

/**
 * PATCH /api/admin/trip-proposals/[id]/status
 * Update the status of a trip proposal
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

  const parseResult = UpdateStatusSchema.safeParse(body);
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

  // Get IP address for accepted status
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const proposal = await tripProposalService.updateStatus(
    proposalId,
    parseResult.data.status,
    {
      actor_type: 'staff',
      actor_user_id: session?.userId ? parseInt(session.userId, 10) : undefined,
      signature: parseResult.data.signature,
      ip_address: ip,
    }
  );

  return NextResponse.json({
    success: true,
    data: proposal,
    message: `Status updated to ${parseResult.data.status}`,
  });
});
