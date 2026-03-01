import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import type { CrmDealWithRelations, UpdateDealData } from '@/types/crm';

interface RouteParams {
  id: string;
}

/**
 * GET /api/admin/crm/deals/[id]
 * Get a single deal with full details
 */
export const GET = withAdminAuth(async (
  _request: NextRequest, _session, context
) => {
  const { id } = await context!.params;
  const dealId = parseInt(id);

  if (isNaN(dealId)) {
    throw new BadRequestError('Invalid deal ID');
  }

  // Get deal with relations
  const result = await query<CrmDealWithRelations>(
    `SELECT
      d.*,
      c.name as contact_name,
      c.email as contact_email,
      c.phone as contact_phone,
      c.company as contact_company,
      ps.name as stage_name,
      ps.color as stage_color,
      ps.probability as stage_probability,
      dt.name as deal_type_name,
      u.name as assigned_user_name
    FROM crm_deals d
    JOIN crm_contacts c ON d.contact_id = c.id
    JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN crm_deal_types dt ON d.deal_type_id = dt.id
    LEFT JOIN users u ON d.assigned_to = u.id
    WHERE d.id = $1`,
    [dealId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Deal not found');
  }

  // Get activities for this deal
  const activitiesResult = await query(
    `SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.deal_id = $1
    ORDER BY a.performed_at DESC
    LIMIT 20`,
    [dealId]
  );

  // Get tasks for this deal
  const tasksResult = await query(
    `SELECT
      t.*,
      u.name as assigned_user_name
    FROM crm_tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.deal_id = $1
    ORDER BY
      CASE WHEN t.status IN ('pending', 'in_progress') THEN 0 ELSE 1 END,
      t.due_date ASC`,
    [dealId]
  );

  // Get available pipeline stages for this deal's template
  const stagesResult = await query(
    `SELECT ps.*
     FROM crm_pipeline_stages ps
     WHERE ps.template_id = (
       SELECT ps2.template_id
       FROM crm_pipeline_stages ps2
       WHERE ps2.id = $1
     )
     ORDER BY ps.sort_order`,
    [result.rows[0].stage_id]
  );

  return NextResponse.json({
    success: true,
    deal: result.rows[0],
    activities: activitiesResult.rows,
    tasks: tasksResult.rows,
    availableStages: stagesResult.rows,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/crm/deals/[id]
 * Update a deal
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { id } = await context!.params;
  const dealId = parseInt(id);

  if (isNaN(dealId)) {
    throw new BadRequestError('Invalid deal ID');
  }

  const body = await request.json() as UpdateDealData & { stage_id?: number };

  // Build update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'stage_id', 'deal_type_id', 'brand', 'title', 'description', 'party_size',
    'expected_tour_date', 'expected_close_date', 'estimated_value', 'actual_value',
    'assigned_to', 'lost_reason'
  ];

  for (const field of allowedFields) {
    if ((body as Record<string, unknown>)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      params.push((body as Record<string, unknown>)[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new BadRequestError('No updates provided');
  }

  params.push(dealId);

  const result = await query(
    `UPDATE crm_deals
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Deal not found');
  }

  return NextResponse.json({
    success: true,
    deal: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/crm/deals/[id]/win
 * Mark a deal as won
 */
export const POST = withAdminAuth(async (
  request: NextRequest, session, context
) => {
  const { id } = await context!.params;
  const dealId = parseInt(id);

  if (isNaN(dealId)) {
    throw new BadRequestError('Invalid deal ID');
  }

  const body = await request.json();
  const { action, actual_value, lost_reason } = body;

  if (action === 'win') {
    // Get won stage ID
    const wonStageResult = await query<{ id: number }>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       WHERE ps.template_id = (
         SELECT ps2.template_id
         FROM crm_deals d
         JOIN crm_pipeline_stages ps2 ON d.stage_id = ps2.id
         WHERE d.id = $1
       ) AND ps.is_won = true
       LIMIT 1`,
      [dealId]
    );

    if (wonStageResult.rows.length === 0) {
      throw new BadRequestError('No won stage found for this pipeline');
    }

    const result = await query(
      `UPDATE crm_deals
       SET stage_id = $1, won_at = NOW(), actual_value = COALESCE($2, estimated_value), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [wonStageResult.rows[0].id, actual_value, dealId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    // Update contact lifecycle to customer
    await query(
      `UPDATE crm_contacts
       SET lifecycle_stage = 'customer', updated_at = NOW()
       WHERE id = $1`,
      [result.rows[0].contact_id]
    );

    // Log activity
    await query(
      `INSERT INTO crm_activities (contact_id, deal_id, activity_type, subject, performed_by, source_type)
       VALUES ($1, $2, 'system', 'Deal won', $3, 'manual')`,
      [result.rows[0].contact_id, dealId, parseInt(session.userId)]
    );

    return NextResponse.json({
      success: true,
      deal: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } else if (action === 'lose') {
    // Get lost stage ID
    const lostStageResult = await query<{ id: number }>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       WHERE ps.template_id = (
         SELECT ps2.template_id
         FROM crm_deals d
         JOIN crm_pipeline_stages ps2 ON d.stage_id = ps2.id
         WHERE d.id = $1
       ) AND ps.is_lost = true
       LIMIT 1`,
      [dealId]
    );

    if (lostStageResult.rows.length === 0) {
      throw new BadRequestError('No lost stage found for this pipeline');
    }

    const result = await query(
      `UPDATE crm_deals
       SET stage_id = $1, lost_at = NOW(), lost_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [lostStageResult.rows[0].id, lost_reason, dealId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    // Log activity
    await query(
      `INSERT INTO crm_activities (contact_id, deal_id, activity_type, subject, body, performed_by, source_type)
       VALUES ($1, $2, 'system', 'Deal lost', $3, $4, 'manual')`,
      [result.rows[0].contact_id, dealId, lost_reason, parseInt(session.userId)]
    );

    return NextResponse.json({
      success: true,
      deal: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  }

  throw new BadRequestError('Invalid action. Use "win" or "lose"');
});
