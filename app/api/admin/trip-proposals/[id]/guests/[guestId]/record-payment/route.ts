import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne } from '@/lib/db-helpers';
import { z } from 'zod';

interface RouteParams { id: string; guestId: string; }

const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/trip-proposals/[id]/guests/[guestId]/record-payment
 * Record a manual payment for a guest
 */
export const POST = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, guestId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id);
    const gId = parseInt(guestId);
    const body = await request.json();
    const validated = RecordPaymentSchema.parse(body);

    // B6 FIX: Verify guest belongs to this proposal
    const guest = await queryOne(
      'SELECT id FROM trip_proposal_guests WHERE id = $1 AND trip_proposal_id = $2',
      [gId, proposalId]
    );
    if (!guest) {
      return NextResponse.json({ success: false, error: 'Guest not found in this proposal' }, { status: 404 });
    }

    await tripProposalService.recordManualPayment(gId, validated.amount, validated.notes);
    return NextResponse.json({ success: true });
  }
);
