/**
 * Individual Trip Proposal Guest API Routes
 * PATCH /api/admin/trip-proposals/[id]/guests/[guestId] - Update guest
 * DELETE /api/admin/trip-proposals/[id]/guests/[guestId] - Delete guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne, QueryParamValue } from '@/lib/db-helpers';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'is_primary', 'dietary_restrictions', 'accessibility_needs', 'special_requests', 'room_assignment', 'rsvp_status'] as const;

/**
 * PATCH /api/admin/trip-proposals/[id]/guests/[guestId]
 * Update a guest's fields
 */
export const PATCH = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id, guestId } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);
  const guestIdNum = parseInt(guestId, 10);

  if (isNaN(proposalId) || isNaN(guestIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  // Build SET clauses from allowed fields
  const setClauses: string[] = [];
  const values: QueryParamValue[] = [];
  let paramIndex = 1;

  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(body[field] as QueryParamValue);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(guestIdNum, proposalId);

  const sql = `UPDATE trip_proposal_guests SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND trip_proposal_id = $${paramIndex + 1} RETURNING *`;
  const result = await queryOne(sql, values);

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Guest not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result });
});

/**
 * DELETE /api/admin/trip-proposals/[id]/guests/[guestId]
 * Delete a guest
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id, guestId } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);
  const guestIdNum = parseInt(guestId, 10);

  if (isNaN(proposalId) || isNaN(guestIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid ID' },
      { status: 400 }
    );
  }

  await tripProposalService.deleteGuest(proposalId, guestIdNum);

  return NextResponse.json({
    success: true,
    message: 'Guest deleted successfully',
  });
});
