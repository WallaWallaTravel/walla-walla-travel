import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
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
export const PATCH = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);
    const body = BodySchema.parse(await request.json());

    // Verify stop belongs to proposal
    const stop = await prisma.$queryRaw<{ id: number }[]>`SELECT s.id FROM trip_proposal_stops s
       JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
       WHERE s.id = ${stopIdNum} AND d.trip_proposal_id = ${proposalId}`;

    if (stop.length === 0) {
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
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}`);
        const val = (body as Record<string, unknown>)[field];
        values.push(val === '' ? null : val);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(stopIdNum);

    const updated = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE trip_proposal_stops
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIdx}
         RETURNING *`,
      ...values
    );

    // Log activity
    try {
      const description = `Vendor info updated for stop #${stopIdNum}`;
      const metadata = JSON.stringify({ stop_id: stopIdNum, fields: Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k)) });
      await prisma.$executeRaw`INSERT INTO trip_proposal_activity (trip_proposal_id, activity_type, description, metadata)
         VALUES (${proposalId}, 'vendor_updated', ${description}, ${metadata}::jsonb)`;
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, data: updated[0] ?? null });
  }
);
