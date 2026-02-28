import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { query, type QueryParamValue } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';

interface RouteParams {
  id: string;
  inclusionId: string;
}

/**
 * PATCH /api/admin/trip-proposals/[id]/inclusions/[inclusionId]
 * Update an inclusion's fields (including tax settings)
 */
export const PATCH = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, inclusionId } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();

    // Validate proposal exists
    const proposal = await tripProposalService.getById(parseInt(id));
    if (!proposal) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    // Build update fields — only allow known fields
    const allowedFields = [
      'description', 'quantity', 'unit', 'unit_price', 'total_price',
      'pricing_type', 'inclusion_type', 'is_taxable', 'tax_included_in_price',
      'show_on_proposal', 'notes', 'sort_order',
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    // Build SET clause
    const setClauses: string[] = [];
    const params: QueryParamValue[] = [];
    let paramIdx = 1;
    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${paramIdx}`);
      params.push(value as QueryParamValue);
      paramIdx++;
    }
    setClauses.push('updated_at = NOW()');
    params.push(parseInt(inclusionId));
    params.push(parseInt(id));

    const result = await query(
      `UPDATE trip_proposal_inclusions SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND trip_proposal_id = $${paramIdx + 1}
       RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Inclusion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  }
);

/**
 * DELETE /api/admin/trip-proposals/[id]/inclusions/[inclusionId]
 * Remove a service line item from a proposal
 */
export const DELETE = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id, inclusionId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id);
    const inclId = parseInt(inclusionId);

    // Validate proposal exists
    const proposal = await tripProposalService.getById(proposalId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    // Verify inclusion belongs to this proposal before deleting
    const existing = await query(
      `SELECT id FROM trip_proposal_inclusions WHERE id = $1 AND trip_proposal_id = $2`,
      [inclId, proposalId]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Inclusion not found for this proposal' }, { status: 404 });
    }

    await tripProposalService.deleteInclusion(inclId);
    logger.info('[TripProposal] Inclusion deleted', { proposalId, inclusionId: inclId });

    return NextResponse.json({ success: true, message: 'Inclusion deleted successfully' });
  }
);
