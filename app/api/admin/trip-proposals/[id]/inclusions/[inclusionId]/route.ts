import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { UpdateInclusionSchema } from '@/lib/types/trip-proposal';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { auditService } from '@/lib/services/audit.service';

interface RouteParams {
  id: string;
  inclusionId: string;
}

/**
 * PATCH /api/admin/trip-proposals/[id]/inclusions/[inclusionId]
 * Update an inclusion's fields (including tax settings)
 */
export const PATCH = withCSRF(
  withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, inclusionId } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();

    // Validate input with Zod — rejects unknown fields and validates types/enums
    const parseResult = UpdateInclusionSchema.safeParse(body);
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

    const updateData = parseResult.data;
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate proposal exists
    const proposal = await tripProposalService.getById(parseInt(id));
    if (!proposal) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    // Build SET clause
    const setClauses: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let paramIdx = 1;
    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${paramIdx}`);
      params.push(value as string | number | boolean | null);
      paramIdx++;
    }
    setClauses.push('updated_at = NOW()');
    params.push(parseInt(inclusionId));
    params.push(parseInt(id));

    const resultRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `UPDATE trip_proposal_inclusions SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND trip_proposal_id = $${paramIdx + 1}
       RETURNING *`,
      ...params
    );

    if (resultRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inclusion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resultRows[0] });
  }
)
);

/**
 * DELETE /api/admin/trip-proposals/[id]/inclusions/[inclusionId]
 * Remove a service line item from a proposal
 */
export const DELETE = withCSRF(
  withAdminAuth(
  async (request: NextRequest, session: AuthSession, context?) => {
    const { id, inclusionId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id);
    const inclId = parseInt(inclusionId);

    // Validate proposal exists
    const proposal = await tripProposalService.getById(proposalId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    // Verify inclusion belongs to this proposal before deleting
    const existing = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM trip_proposal_inclusions WHERE id = $1 AND trip_proposal_id = $2`,
      inclId, proposalId
    );

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Inclusion not found for this proposal' }, { status: 404 });
    }

    await tripProposalService.deleteInclusion(inclId);
    logger.info('[TripProposal] Inclusion deleted', { proposalId, inclusionId: inclId });

    await auditService.logFromRequest(request, parseInt(session.userId), 'resource_deleted', {
      entityType: 'trip_proposal_inclusion',
      entityId: inclId,
      proposalId,
    });

    return NextResponse.json({ success: true, message: 'Inclusion deleted successfully' });
  }
)
);
