/**
 * Client Trip Proposal Accept API Routes
 * POST /api/trip-proposals/[proposalNumber]/accept - Accept proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { tripProposalEmailService } from '@/lib/services/trip-proposal-email.service';
import { z } from 'zod';

interface RouteParams {
  proposalNumber: string;
}

const AcceptSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  agreed_to_terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

/**
 * POST /api/trip-proposals/[proposalNumber]/accept
 * Client accepts the proposal with signature
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { proposalNumber } = await context.params;

    if (!proposalNumber || !proposalNumber.startsWith('TP-')) {
      return NextResponse.json(
        { success: false, error: 'Invalid proposal number' },
        { status: 400 }
      );
    }

    const proposal = await tripProposalService.getByNumber(proposalNumber);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Only allow accepting sent or viewed proposals
    if (!['sent', 'viewed'].includes(proposal.status)) {
      return NextResponse.json(
        {
          success: false,
          error:
            proposal.status === 'accepted'
              ? 'This proposal has already been accepted'
              : 'This proposal cannot be accepted',
        },
        { status: 400 }
      );
    }

    // Check if still valid
    if (proposal.valid_until) {
      const validUntil = new Date(proposal.valid_until);
      if (validUntil < new Date()) {
        // Mark as expired
        await tripProposalService.updateStatus(proposal.id, 'expired', {
          actor_type: 'system',
        });

        return NextResponse.json(
          { success: false, error: 'This proposal has expired' },
          { status: 400 }
        );
      }
    }

    const body = await request.json();

    const parseResult = AcceptSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const updatedProposal = await tripProposalService.updateStatus(
      proposal.id,
      'accepted',
      {
        actor_type: 'customer',
        signature: parseResult.data.signature,
        ip_address: ip,
      }
    );

    // Trigger "accepted" email (non-blocking)
    after(async () => {
      await tripProposalEmailService.sendProposalAcceptedEmail(proposal.id);
    });

    return NextResponse.json({
      success: true,
      data: {
        proposal_number: updatedProposal.proposal_number,
        status: updatedProposal.status,
        accepted_at: updatedProposal.accepted_at,
        deposit_amount: updatedProposal.deposit_amount,
        total: updatedProposal.total,
      },
      message: 'Proposal accepted successfully',
    });
  }
);
