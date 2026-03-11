/**
 * Individual Trip Proposal Guest API Routes
 * PATCH /api/admin/trip-proposals/[id]/guests/[guestId] - Update guest
 * DELETE /api/admin/trip-proposals/[id]/guests/[guestId] - Delete guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auditService } from '@/lib/services/audit.service';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'is_primary', 'dietary_restrictions', 'accessibility_needs', 'special_requests', 'room_assignment', 'rsvp_status'] as const;

const PatchBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  is_primary: z.boolean().optional(),
  dietary_restrictions: z.string().max(500).optional(),
  accessibility_needs: z.string().max(500).optional(),
  special_requests: z.string().max(5000).optional(),
  room_assignment: z.string().max(255).optional(),
  rsvp_status: z.string().max(50).optional(),
});

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

  const body = PatchBodySchema.parse(await request.json());

  // Build SET clauses from allowed fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(body[field]);
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
  const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...values);

  if (result.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Guest not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result[0] });
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

  await auditService.logFromRequest(request, parseInt(session.userId), 'resource_deleted', {
    entityType: 'trip_proposal_guest',
    entityId: guestIdNum,
    proposalId,
  });

  return NextResponse.json({
    success: true,
    message: 'Guest deleted successfully',
  });
});
