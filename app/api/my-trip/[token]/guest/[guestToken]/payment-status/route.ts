import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';

interface RouteParams { token: string; guestToken: string; }

/**
 * GET /api/my-trip/[token]/guest/[guestToken]/payment-status
 * Guest's billing summary (client-facing)
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token, guestToken } = await (context as RouteContext<RouteParams>).params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) throw new NotFoundError('Trip not found');

    const guestRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, name, email, amount_owed, amount_paid, payment_status, is_sponsored, payment_group_id
      FROM trip_proposal_guests
      WHERE trip_proposal_id = ${proposal.id} AND guest_access_token = ${guestToken}`;
    const guest = guestRows[0] ?? null;

    if (!guest) throw new NotFoundError('Guest not found');

    // Get payment history
    const payments = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, amount, payment_type, status, created_at
      FROM guest_payments
      WHERE guest_id = ${guest.id} AND status = 'succeeded'
      ORDER BY created_at DESC`;

    return NextResponse.json({
      success: true,
      data: {
        guest_name: guest.name,
        amount_owed: parseFloat(guest.amount_owed as string) || 0,
        amount_paid: parseFloat(guest.amount_paid as string) || 0,
        amount_remaining: Math.max(0, (parseFloat(guest.amount_owed as string) || 0) - (parseFloat(guest.amount_paid as string) || 0)),
        payment_status: guest.payment_status,
        is_sponsored: guest.is_sponsored,
        payment_deadline: proposal.payment_deadline,
        proposal_number: proposal.proposal_number,
        trip_title: proposal.trip_title,
        payments,
      },
    });
  }
);
