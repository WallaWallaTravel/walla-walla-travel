import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import type { CrmContactSummary, CreateContactData } from '@/types/crm';

/**
 * GET /api/admin/crm/contacts
 * List all CRM contacts with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const lifecycleStage = searchParams.get('lifecycle_stage');
  const leadTemperature = searchParams.get('lead_temperature');
  const contactType = searchParams.get('contact_type');
  const assignedTo = searchParams.get('assigned_to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (lifecycleStage) {
    conditions.push(`c.lifecycle_stage = $${paramIndex}`);
    params.push(lifecycleStage);
    paramIndex++;
  }

  if (leadTemperature) {
    conditions.push(`c.lead_temperature = $${paramIndex}`);
    params.push(leadTemperature);
    paramIndex++;
  }

  if (contactType) {
    conditions.push(`c.contact_type = $${paramIndex}`);
    params.push(contactType);
    paramIndex++;
  }

  if (assignedTo) {
    conditions.push(`c.assigned_to = $${paramIndex}`);
    params.push(parseInt(assignedTo));
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get contacts with summary data
  const result = await query<CrmContactSummary>(
    `SELECT
      c.*,
      u.name as assigned_user_name,
      COUNT(DISTINCT d.id) FILTER (WHERE d.won_at IS NULL AND d.lost_at IS NULL) as active_deals,
      COALESCE(SUM(d.estimated_value) FILTER (WHERE d.won_at IS NULL AND d.lost_at IS NULL), 0) as pipeline_value,
      COUNT(DISTINCT d.id) FILTER (WHERE d.won_at IS NOT NULL) as won_deals,
      COALESCE(SUM(d.actual_value) FILTER (WHERE d.won_at IS NOT NULL), 0) as won_value,
      (SELECT COUNT(*) FROM crm_tasks t WHERE t.contact_id = c.id AND t.status = 'pending') as pending_tasks,
      (SELECT MAX(performed_at) FROM crm_activities a WHERE a.contact_id = c.id) as last_activity_at
    FROM crm_contacts c
    LEFT JOIN users u ON c.assigned_to = u.id
    LEFT JOIN crm_deals d ON d.contact_id = c.id
    ${whereClause}
    GROUP BY c.id, u.name
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM crm_contacts c ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.count || '0');

  // Get counts by lifecycle stage
  const stageCountsResult = await query<{ lifecycle_stage: string; count: string }>(
    `SELECT lifecycle_stage, COUNT(*) as count
     FROM crm_contacts
     GROUP BY lifecycle_stage`,
    []
  );

  const stageCounts = stageCountsResult.rows.reduce((acc, row) => {
    acc[row.lifecycle_stage] = parseInt(row.count);
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    success: true,
    contacts: result.rows,
    total,
    page,
    limit,
    stageCounts,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/crm/contacts
 * Create a new CRM contact
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json() as CreateContactData;

  // Validate required fields
  if (!body.email || !body.name) {
    throw new BadRequestError('Email and name are required');
  }

  // Check for duplicate email
  const existingContact = await query<{ id: number }>(
    `SELECT id FROM crm_contacts WHERE email = $1`,
    [body.email.toLowerCase()]
  );

  if (existingContact.rows.length > 0) {
    throw new BadRequestError('A contact with this email already exists');
  }

  // Build insert query
  const fields: string[] = ['email', 'name'];
  const values: unknown[] = [body.email.toLowerCase(), body.name];
  let paramIndex = 3;

  const optionalFields: (keyof CreateContactData)[] = [
    'phone', 'company', 'contact_type', 'lifecycle_stage', 'lead_temperature',
    'source', 'source_detail', 'preferred_wineries', 'dietary_restrictions',
    'accessibility_needs', 'notes', 'email_marketing_consent', 'sms_marketing_consent',
    'assigned_to'
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
    `INSERT INTO crm_contacts (${fields.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );

  // Log activity
  await query(
    `INSERT INTO crm_activities (contact_id, activity_type, subject, performed_by, source_type)
     VALUES ($1, 'system', 'Contact created', $2, 'manual')`,
    [result.rows[0].id, session.user.id]
  );

  return NextResponse.json({
    success: true,
    contact: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});
