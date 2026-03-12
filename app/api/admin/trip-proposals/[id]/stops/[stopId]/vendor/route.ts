import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

interface RouteParams { id: string; stopId: string; }

const ALLOWED_FIELDS = [
  'vendor_name', 'vendor_email', 'vendor_phone',
  'quote_status', 'quoted_amount', 'quote_notes',
];

const VALID_QUOTE_STATUSES = ['none', 'requested', 'quoted', 'accepted', 'confirmed', 'paid'];

const BodySchema = z.object({
  vendor_name: z.string().max(255).optional(),
  vendor_email: z.string().email().max(255).optional(),
  vendor_phone: z.string().max(50).optional(),
  quote_status: z.enum(['none', 'requested', 'quoted', 'accepted', 'confirmed', 'paid']).optional(),
  quoted_amount: z.number().optional(),
  quote_notes: z.string().max(5000).optional(),
});

/**
 * PATCH /api/admin/trip-proposals/[id]/stops/[stopId]/vendor
 * Update vendor info and quote status for a stop
 */
export const PATCH = withCSRF(
  withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);
    const body = BodySchema.parse(await request.json());

    // Verify stop belongs to proposal
    const stopRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT s.id FROM trip_proposal_stops s
       JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
       WHERE s.id = $1 AND d.trip_proposal_id = $2`,
      stopIdNum, proposalId
    );

    if (!stopRows[0]) {
      return NextResponse.json({ success: false, error: 'Stop not found' }, { status: 404 });
    }

    // Validate quote_status if provided
    if (body.quote_status && !VALID_QUOTE_STATUSES.includes(body.quote_status)) {
      return NextResponse.json(
        { success: false, error: `Invalid quote_status. Must be one of: ${VALID_QUOTE_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIdx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}`);
        const val = (body as Record<string, unknown>)[field];
        values.push((val === '' ? null : val) as string | number | boolean | null);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(stopIdNum);

    const updatedRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `UPDATE trip_proposal_stops
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING *`,
      ...values
    );
    const updated = updatedRows[0];

    // Log activity
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO trip_proposal_activity (trip_proposal_id, activity_type, description, metadata)
         VALUES ($1, 'vendor_updated', $2, $3)`,
        proposalId,
        `Vendor info updated for stop #${stopIdNum}`,
        JSON.stringify({ stop_id: stopIdNum, fields: Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k)) })
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, data: updated });
  }
)
);
