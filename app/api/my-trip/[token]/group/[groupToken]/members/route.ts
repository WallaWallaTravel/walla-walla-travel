import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne, queryMany } from '@/lib/db-helpers';

interface RouteParams { token: string; groupToken: string; }

/**
 * GET /api/my-trip/[token]/group/[groupToken]/members
 * Returns group name + member list with payment status (B5 fix)
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token, groupToken } = await (context as RouteContext<RouteParams>).params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) throw new NotFoundError('Trip not found');

    // Verify group belongs to this proposal
    const group = await queryOne<{ id: string; trip_proposal_id: number; group_name: string }>(
      'SELECT id, trip_proposal_id, group_name FROM guest_payment_groups WHERE group_access_token = $1',
      [groupToken]
    );

    if (!group || group.trip_proposal_id !== proposal.id) {
      throw new NotFoundError('Payment group not found');
    }

    // Get all members in this group
    const members = await queryMany<{
      id: number; name: string; amount_owed: string; amount_paid: string; payment_status: string;
    }>(
      `SELECT id, name, amount_owed, amount_paid, payment_status
       FROM trip_proposal_guests
       WHERE payment_group_id = $1
       ORDER BY name ASC`,
      [group.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        group_name: group.group_name,
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          amount_owed: parseFloat(m.amount_owed) || 0,
          amount_paid: parseFloat(m.amount_paid) || 0,
          payment_status: m.payment_status,
        })),
      },
    });
  }
);
