import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, BadRequestError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import type { CrmContactSummary, UpdateContactData } from '@/types/crm';

interface RouteParams {
  id: string;
}

/**
 * GET /api/admin/crm/contacts/[id]
 * Get a single contact with full details
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext<RouteParams>
) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await context.params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    throw new BadRequestError('Invalid contact ID');
  }

  // Get contact with summary data
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
    WHERE c.id = $1
    GROUP BY c.id, u.name`,
    [contactId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Contact not found');
  }

  // Get deals for this contact
  const dealsResult = await query(
    `SELECT
      d.*,
      ps.name as stage_name,
      ps.color as stage_color,
      dt.name as deal_type_name
    FROM crm_deals d
    JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN crm_deal_types dt ON d.deal_type_id = dt.id
    WHERE d.contact_id = $1
    ORDER BY d.created_at DESC`,
    [contactId]
  );

  // Get recent activities for this contact
  const activitiesResult = await query(
    `SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.contact_id = $1
    ORDER BY a.performed_at DESC
    LIMIT 20`,
    [contactId]
  );

  // Get tasks for this contact
  const tasksResult = await query(
    `SELECT
      t.*,
      u.name as assigned_user_name
    FROM crm_tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.contact_id = $1
    ORDER BY
      CASE WHEN t.status IN ('pending', 'in_progress') THEN 0 ELSE 1 END,
      t.due_date ASC`,
    [contactId]
  );

  return NextResponse.json({
    success: true,
    contact: result.rows[0],
    deals: dealsResult.rows,
    activities: activitiesResult.rows,
    tasks: tasksResult.rows,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/crm/contacts/[id]
 * Update a contact
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext<RouteParams>
) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await context.params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    throw new BadRequestError('Invalid contact ID');
  }

  const body = await request.json() as UpdateContactData;

  // Build update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const allowedFields: (keyof UpdateContactData)[] = [
    'email', 'name', 'phone', 'company', 'contact_type', 'lifecycle_stage',
    'lead_score', 'lead_temperature', 'source', 'source_detail',
    'preferred_wineries', 'dietary_restrictions', 'accessibility_needs', 'notes',
    'email_marketing_consent', 'sms_marketing_consent', 'assigned_to', 'next_follow_up_at'
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      params.push(body[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new BadRequestError('No updates provided');
  }

  params.push(contactId);

  const result = await query(
    `UPDATE crm_contacts
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Contact not found');
  }

  return NextResponse.json({
    success: true,
    contact: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/admin/crm/contacts/[id]
 * Delete a contact (soft delete by setting lifecycle_stage to 'lost')
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext<RouteParams>
) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await context.params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    throw new BadRequestError('Invalid contact ID');
  }

  // Check if contact has active deals
  const activeDealsResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM crm_deals WHERE contact_id = $1 AND won_at IS NULL AND lost_at IS NULL`,
    [contactId]
  );

  if (parseInt(activeDealsResult.rows[0]?.count || '0') > 0) {
    throw new BadRequestError('Cannot delete contact with active deals. Close or reassign deals first.');
  }

  // Soft delete - mark as lost
  const result = await query(
    `UPDATE crm_contacts
     SET lifecycle_stage = 'lost', updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [contactId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Contact not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Contact marked as lost',
    timestamp: new Date().toISOString(),
  });
});
