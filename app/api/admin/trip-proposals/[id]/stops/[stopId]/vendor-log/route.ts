import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { query, queryOne } from '@/lib/db-helpers';

interface RouteParams { id: string; stopId: string; }

/**
 * GET /api/admin/trip-proposals/[id]/stops/[stopId]/vendor-log
 * Fetch vendor interaction log for a stop
 */
export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);

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

    const interactions = await query(
      `SELECT vi.*, u.email as contacted_by_email
       FROM vendor_interactions vi
       LEFT JOIN users u ON u.id = vi.contacted_by
       WHERE vi.trip_proposal_stop_id = $1
       ORDER BY vi.created_at DESC`,
      [stopIdNum]
    );

    return NextResponse.json({ success: true, data: interactions });
  }
);

/**
 * POST /api/admin/trip-proposals/[id]/stops/[stopId]/vendor-log
 * Add a vendor interaction log entry
 *
 * Body: { interaction_type, content }
 */
export const POST = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id, stopId } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const stopIdNum = parseInt(stopId, 10);
    const body = await request.json();

    const validTypes = ['note', 'email_sent', 'email_received', 'phone_call', 'quote_received'];
    if (!body.interaction_type || !validTypes.includes(body.interaction_type)) {
      return NextResponse.json(
        { success: false, error: `interaction_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { success: false, error: 'content is required' },
        { status: 400 }
      );
    }

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

    const interaction = await queryOne(
      `INSERT INTO vendor_interactions (
        trip_proposal_stop_id, interaction_type, content
      ) VALUES ($1, $2, $3)
      RETURNING *`,
      [stopIdNum, body.interaction_type, body.content.trim()]
    );

    return NextResponse.json({ success: true, data: interaction });
  }
);
