import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { CrmDealWithRelations, UpdateDealData } from '@/types/crm';
import { withCSRF } from '@/lib/api/middleware/csrf';

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
  const rows = await prisma.$queryRawUnsafe<CrmDealWithRelations[]>(
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
    dealId
  );

  if (rows.length === 0) {
    throw new NotFoundError('Deal not found');
  }

  // Get activities for this deal
  const activities = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.deal_id = $1
    ORDER BY a.performed_at DESC
    LIMIT 20`,
    dealId
  );

  // Get tasks for this deal
  const tasks = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
      t.*,
      u.name as assigned_user_name
    FROM crm_tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.deal_id = $1
    ORDER BY
      CASE WHEN t.status IN ('pending', 'in_progress') THEN 0 ELSE 1 END,
      t.due_date ASC`,
    dealId
  );

  // Get available pipeline stages for this deal's template
  const availableStages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ps.*
     FROM crm_pipeline_stages ps
     WHERE ps.template_id = (
       SELECT ps2.template_id
       FROM crm_pipeline_stages ps2
       WHERE ps2.id = $1
     )
     ORDER BY ps.sort_order`,
    rows[0].stage_id
  );

  return NextResponse.json({
    success: true,
    deal: rows[0],
    activities,
    tasks,
    availableStages,
    timestamp: new Date().toISOString(),
  });
});

const PatchBodySchema = z.object({
  stage_id: z.number().int().positive().optional(),
  deal_type_id: z.number().int().positive().nullable().optional(),
  brand: z.string().max(255).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  party_size: z.number().int().positive().optional(),
  expected_tour_date: z.string().optional(),
  expected_close_date: z.string().optional(),
  estimated_value: z.number().nonnegative().optional(),
  actual_value: z.number().nonnegative().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  lost_reason: z.string().max(500).optional(),
});

const PostBodySchema = z.object({
  action: z.enum(['win', 'lose']),
  actual_value: z.number().nonnegative().optional(),
  lost_reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/crm/deals/[id]
 * Update a deal
 */
export const PATCH = withCSRF(
  withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { id } = await context!.params;
  const dealId = parseInt(id);

  if (isNaN(dealId)) {
    throw new BadRequestError('Invalid deal ID');
  }

  const body = PatchBodySchema.parse(await request.json()) as UpdateDealData & { stage_id?: number };

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

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE crm_deals
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    ...params
  );

  if (rows.length === 0) {
    throw new NotFoundError('Deal not found');
  }

  return NextResponse.json({
    success: true,
    deal: rows[0],
    timestamp: new Date().toISOString(),
  });
})
);

/**
 * POST /api/admin/crm/deals/[id]/win
 * Mark a deal as won
 */
export const POST = withCSRF(
  withAdminAuth(async (
  request: NextRequest, session, context
) => {
  const { id } = await context!.params;
  const dealId = parseInt(id);

  if (isNaN(dealId)) {
    throw new BadRequestError('Invalid deal ID');
  }

  const body = PostBodySchema.parse(await request.json());
  const { action, actual_value, lost_reason } = body;

  if (action === 'win') {
    // Get won stage ID
    const wonStageRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       WHERE ps.template_id = (
         SELECT ps2.template_id
         FROM crm_deals d
         JOIN crm_pipeline_stages ps2 ON d.stage_id = ps2.id
         WHERE d.id = $1
       ) AND ps.is_won = true
       LIMIT 1`,
      dealId
    );

    if (wonStageRows.length === 0) {
      throw new BadRequestError('No won stage found for this pipeline');
    }

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE crm_deals
       SET stage_id = $1, won_at = NOW(), actual_value = COALESCE($2, estimated_value), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      wonStageRows[0].id, actual_value, dealId
    );

    if (rows.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    // Update contact lifecycle to customer
    await prisma.$queryRawUnsafe(
      `UPDATE crm_contacts
       SET lifecycle_stage = 'customer', updated_at = NOW()
       WHERE id = $1`,
      rows[0].contact_id
    );

    // Log activity
    await prisma.$queryRawUnsafe(
      `INSERT INTO crm_activities (contact_id, deal_id, activity_type, subject, performed_by, source_type)
       VALUES ($1, $2, 'system', 'Deal won', $3, 'manual')`,
      rows[0].contact_id, dealId, parseInt(session.userId)
    );

    return NextResponse.json({
      success: true,
      deal: rows[0],
      timestamp: new Date().toISOString(),
    });
  } else if (action === 'lose') {
    // Get lost stage ID
    const lostStageRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       WHERE ps.template_id = (
         SELECT ps2.template_id
         FROM crm_deals d
         JOIN crm_pipeline_stages ps2 ON d.stage_id = ps2.id
         WHERE d.id = $1
       ) AND ps.is_lost = true
       LIMIT 1`,
      dealId
    );

    if (lostStageRows.length === 0) {
      throw new BadRequestError('No lost stage found for this pipeline');
    }

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE crm_deals
       SET stage_id = $1, lost_at = NOW(), lost_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      lostStageRows[0].id, lost_reason, dealId
    );

    if (rows.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    // Log activity
    await prisma.$queryRawUnsafe(
      `INSERT INTO crm_activities (contact_id, deal_id, activity_type, subject, body, performed_by, source_type)
       VALUES ($1, $2, 'system', 'Deal lost', $3, $4, 'manual')`,
      rows[0].contact_id, dealId, lost_reason, parseInt(session.userId)
    );

    return NextResponse.json({
      success: true,
      deal: rows[0],
      timestamp: new Date().toISOString(),
    });
  }

  throw new BadRequestError('Invalid action. Use "win" or "lose"');
})
);
