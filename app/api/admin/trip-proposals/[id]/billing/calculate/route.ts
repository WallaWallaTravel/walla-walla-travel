import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';

interface RouteParams { id: string; }

/**
 * POST /api/admin/trip-proposals/[id]/billing/calculate
 * Trigger calculateGuestAmounts() to distribute amounts per guest
 */
export const POST = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const result = await tripProposalService.calculateGuestAmounts(parseInt(id));
    return NextResponse.json({ success: true, data: result });
  }
);
