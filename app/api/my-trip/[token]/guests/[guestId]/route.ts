/**
 * Client-Facing Guest Update API
 * PATCH /api/my-trip/[token]/guests/[guestId]
 * Allows clients to update dietary/accessibility info for their guests
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';

const BodySchema = z.object({
  dietary_restrictions: z.string().max(1000).nullable().optional(),
  accessibility_needs: z.string().max(1000).nullable().optional(),
  special_requests: z.string().max(2000).nullable().optional(),
});

interface RouteParams {
  token: string;
  guestId: string;
}

export const PATCH = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token, guestId } = await context.params;

    // Validate token
    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Only allow updates during active_planning phase
    if (proposal.planning_phase !== 'active_planning') {
      return NextResponse.json(
        { success: false, error: 'Guest updates are not available at this time' },
        { status: 403 }
      );
    }

    const body = BodySchema.parse(await request.json());

    // Only allow updating specific fields (dietary, accessibility, special requests)
    const allowedFields = ['dietary_restrictions', 'accessibility_needs', 'special_requests'] as const;
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Verify guest belongs to this proposal
    const guestIdNum = parseInt(guestId, 10);
    if (isNaN(guestIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    // Build update query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE trip_proposal_guests
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND trip_proposal_id = $${paramIndex + 1}
       RETURNING *`,
      ...values, guestIdNum, proposal.id
    );

    if (!rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  }
);
