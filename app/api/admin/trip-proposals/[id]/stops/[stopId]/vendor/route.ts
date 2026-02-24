import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { query, queryOne, type QueryParamValue } from '@/lib/db-helpers';

interface RouteParams { id: string; stopId: string; }

const ALLOWED_FIELDS = [
  'vendor_name', 'vendor_email', 'vendor_phone',
  'quote_status', 'quoted_amount', 'quote_notes',
];

const VALID_QUOTE_STATUSES = ['none', 'requested', 'quoted', 'accepted', 'confirmed', 'paid'];

/**
 * PATCH /api/admin/trip-proposals/[id]/stops/[stopId]/vendor
 * Update vendor info and quote status for a stop
 */
export const PATCH = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);
    const body = await request.json();

    // Verify stop belongs to proposal
    const stop = await queryOne(
      `SELECT s.id FROM trip_proposal_stops s
       JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
       WHERE s.id = $1 AND d.trip_proposal_id = $2`,
      [stopIdNum, proposalId]
    );

    if (!stop) {
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
    const values: QueryParamValue[] = [];
    let paramIdx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}`);
        values.push((body[field] === '' ? null : body[field]) as QueryParamValue);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(stopIdNum);

    const updated = await queryOne(
      `UPDATE trip_proposal_stops
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING *`,
      values
    );

    // Log activity
    try {
      await query(
        `INSERT INTO trip_proposal_activity (trip_proposal_id, activity_type, description, metadata)
         VALUES ($1, 'vendor_updated', $2, $3)`,
        [
          proposalId,
          `Vendor info updated for stop #${stopIdNum}`,
          JSON.stringify({ stop_id: stopIdNum, fields: Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k)) }),
        ]
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, data: updated });
  }
);
