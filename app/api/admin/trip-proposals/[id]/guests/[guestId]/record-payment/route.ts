import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
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
    const { guestId } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const validated = RecordPaymentSchema.parse(body);

    await tripProposalService.recordManualPayment(parseInt(guestId), validated.amount, validated.notes);
    return NextResponse.json({ success: true });
  }
);
