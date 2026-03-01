import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import type { CrmActivityWithUser, CreateActivityData } from '@/types/crm';

/**
 * GET /api/admin/crm/contacts/[id]/activities
 * Get all activities for a contact
 */
export const GET = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { id } = await context!.params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    throw new BadRequestError('Invalid contact ID');
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const result = await query<CrmActivityWithUser>(
    `SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.contact_id = $1
    ORDER BY a.performed_at DESC
    LIMIT $2 OFFSET $3`,
    [contactId, limit, offset]
  );

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM crm_activities WHERE contact_id = $1`,
    [contactId]
  );

  return NextResponse.json({
    success: true,
    activities: result.rows,
    total: parseInt(countResult.rows[0]?.count || '0'),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/crm/contacts/[id]/activities
 * Log a new activity for a contact
 */
export const POST = withAdminAuth(async (
  request: NextRequest, session, context
) => {
  const { id } = await context!.params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    throw new BadRequestError('Invalid contact ID');
  }

  const body = await request.json() as CreateActivityData;

  if (!body.activity_type) {
    throw new BadRequestError('activity_type is required');
  }

  // Build insert query
  const fields: string[] = ['contact_id', 'activity_type', 'performed_by', 'source_type'];
  const values: unknown[] = [contactId, body.activity_type, parseInt(session.userId), 'manual'];
  let _paramIndex = 5;

  const optionalFields: (keyof CreateActivityData)[] = [
    'deal_id', 'subject', 'body', 'call_duration_minutes', 'call_outcome',
    'email_direction', 'email_status', 'source_id'
  ];

  for (const field of optionalFields) {
    if (body[field] !== undefined) {
      fields.push(field);
      values.push(body[field]);
      _paramIndex++;
    }
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query(
    `INSERT INTO crm_activities (${fields.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );

  return NextResponse.json({
    success: true,
    activity: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});
