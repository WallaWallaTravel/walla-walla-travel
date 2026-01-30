import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import type { CrmDealWithRelations, CreateDealData } from '@/types/crm';

/**
 * GET /api/admin/crm/deals
 * List all CRM deals with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const stageId = searchParams.get('stage_id');
  const brand = searchParams.get('brand');
  const dealTypeId = searchParams.get('deal_type_id');
  const assignedTo = searchParams.get('assigned_to');
  const contactId = searchParams.get('contact_id');
  const includeWon = searchParams.get('include_won') === 'true';
  const includeLost = searchParams.get('include_lost') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // By default, exclude won/lost deals unless explicitly requested
  if (!includeWon) {
    conditions.push('d.won_at IS NULL');
  }
  if (!includeLost) {
    conditions.push('d.lost_at IS NULL');
  }

  if (search) {
    conditions.push(`(d.title ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (stageId) {
    conditions.push(`d.stage_id = $${paramIndex}`);
    params.push(parseInt(stageId));
    paramIndex++;
  }

  if (brand) {
    conditions.push(`d.brand = $${paramIndex}`);
    params.push(brand);
    paramIndex++;
  }

  if (dealTypeId) {
    conditions.push(`d.deal_type_id = $${paramIndex}`);
    params.push(parseInt(dealTypeId));
    paramIndex++;
  }

  if (assignedTo) {
    conditions.push(`d.assigned_to = $${paramIndex}`);
    params.push(parseInt(assignedTo));
    paramIndex++;
  }

  if (contactId) {
    conditions.push(`d.contact_id = $${paramIndex}`);
    params.push(parseInt(contactId));
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get deals with relations
  const result = await query<CrmDealWithRelations>(
    `SELECT
      d.*,
      c.name as contact_name,
      c.email as contact_email,
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
    ${whereClause}
    ORDER BY d.stage_changed_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM crm_deals d
     JOIN crm_contacts c ON d.contact_id = c.id
     ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.count || '0');

  // Get pipeline value summary
  const summaryResult = await query<{
    total_value: string;
    weighted_value: string;
    deal_count: string;
  }>(
    `SELECT
      COALESCE(SUM(d.estimated_value), 0) as total_value,
      COALESCE(SUM(d.estimated_value * ps.probability / 100), 0) as weighted_value,
      COUNT(*) as deal_count
    FROM crm_deals d
    JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.won_at IS NULL AND d.lost_at IS NULL`,
    []
  );

  const summary = summaryResult.rows[0];

  return NextResponse.json({
    success: true,
    deals: result.rows,
    total,
    page,
    limit,
    summary: {
      totalValue: parseFloat(summary?.total_value || '0'),
      weightedValue: parseFloat(summary?.weighted_value || '0'),
      dealCount: parseInt(summary?.deal_count || '0'),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/crm/deals
 * Create a new CRM deal
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json() as CreateDealData;

  // Validate required fields
  if (!body.contact_id || !body.stage_id || !body.title) {
    throw new BadRequestError('contact_id, stage_id, and title are required');
  }

  // Verify contact exists
  const contactCheck = await query<{ id: number }>(
    `SELECT id FROM crm_contacts WHERE id = $1`,
    [body.contact_id]
  );

  if (contactCheck.rows.length === 0) {
    throw new BadRequestError('Contact not found');
  }

  // Verify stage exists
  const stageCheck = await query<{ id: number }>(
    `SELECT id FROM crm_pipeline_stages WHERE id = $1`,
    [body.stage_id]
  );

  if (stageCheck.rows.length === 0) {
    throw new BadRequestError('Pipeline stage not found');
  }

  // Build insert query
  const fields: string[] = ['contact_id', 'stage_id', 'title'];
  const values: unknown[] = [body.contact_id, body.stage_id, body.title];
  let paramIndex = 4;

  const optionalFields: (keyof CreateDealData)[] = [
    'deal_type_id', 'brand', 'description', 'party_size',
    'expected_tour_date', 'expected_close_date', 'estimated_value',
    'assigned_to', 'consultation_id', 'corporate_request_id', 'trip_proposal_id'
  ];

  for (const field of optionalFields) {
    if (body[field] !== undefined) {
      fields.push(field);
      values.push(body[field]);
      paramIndex++;
    }
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query(
    `INSERT INTO crm_deals (${fields.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );

  const deal = result.rows[0];

  // Update contact lifecycle stage to 'opportunity' if currently 'lead' or 'qualified'
  await query(
    `UPDATE crm_contacts
     SET lifecycle_stage = 'opportunity', updated_at = NOW()
     WHERE id = $1 AND lifecycle_stage IN ('lead', 'qualified')`,
    [body.contact_id]
  );

  // Log activity
  await query(
    `INSERT INTO crm_activities (contact_id, deal_id, activity_type, subject, performed_by, source_type)
     VALUES ($1, $2, 'system', 'Deal created: ' || $3, $4, 'manual')`,
    [body.contact_id, deal.id, body.title, session.user.id]
  );

  return NextResponse.json({
    success: true,
    deal,
    timestamp: new Date().toISOString(),
  });
});
