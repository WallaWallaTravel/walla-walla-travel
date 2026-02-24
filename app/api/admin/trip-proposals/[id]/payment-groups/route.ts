import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { z } from 'zod';

interface RouteParams { id: string; }

const CreateGroupSchema = z.object({
  guest_ids: z.array(z.number().int().positive()).min(1),
  name: z.string().min(1).max(255),
});

/**
 * POST /api/admin/trip-proposals/[id]/payment-groups
 * Create a payment group (couples/subgroups)
 */
export const POST = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const validated = CreateGroupSchema.parse(body);

    const group = await tripProposalService.createPaymentGroup(
      parseInt(id),
      validated.guest_ids,
      validated.name
    );

    return NextResponse.json({ success: true, data: group });
  }
);

/**
 * DELETE /api/admin/trip-proposals/[id]/payment-groups?groupId=xxx
 * Remove a payment group
 */
export const DELETE = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json({ success: false, error: 'groupId required' }, { status: 400 });
    }

    await tripProposalService.removePaymentGroup(groupId);
    return NextResponse.json({ success: true });
  }
);
