import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { partnerRequestService } from '@/lib/services/partner-request.service';

interface RouteParams { id: string; stopId: string; }

/**
 * GET /api/admin/trip-proposals/[id]/stops/[stopId]/thread
 *
 * Returns the unified conversation thread for a stop.
 * Combines vendor_interactions, partner_request_tokens, and partner_responses
 * into a single chronological view.
 */
export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);

    // Verify stop belongs to proposal
    const stopExists = await partnerRequestService.verifyStop(stopIdNum, proposalId);
    if (!stopExists) {
      return NextResponse.json(
        { success: false, error: 'Stop not found' },
        { status: 404 }
      );
    }

    const thread = await partnerRequestService.getStopConversation(stopIdNum);
    return NextResponse.json({ success: true, data: thread });
  }
);
