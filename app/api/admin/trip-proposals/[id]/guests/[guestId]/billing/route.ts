import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne } from '@/lib/db-helpers';

interface RouteParams { id: string; guestId: string; }

/**
 * PATCH /api/admin/trip-proposals/[id]/guests/[guestId]/billing
 * Update guest billing: sponsor toggle, amount override, group assignment
 */
export const PATCH = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, guestId } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const gId = parseInt(guestId);
    const proposalId = parseInt(id);

    // B6 FIX: Verify guest belongs to this proposal before any action
    const guest = await queryOne(
      'SELECT id FROM trip_proposal_guests WHERE id = $1 AND trip_proposal_id = $2',
      [gId, proposalId]
    );
    if (!guest) {
      return NextResponse.json({ success: false, error: 'Guest not found in this proposal' }, { status: 404 });
    }

    // Handle sponsor toggle
    if (body.is_sponsored !== undefined) {
      await tripProposalService.toggleGuestSponsored(gId, body.is_sponsored);
      return NextResponse.json({ success: true });
    }

    // Handle amount override
    if (body.amount_owed_override !== undefined) {
      const amount = body.amount_owed_override === null ? null : parseFloat(body.amount_owed_override);
      await tripProposalService.overrideGuestAmount(gId, amount);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'No valid billing action specified' }, { status: 400 });
  }
);
