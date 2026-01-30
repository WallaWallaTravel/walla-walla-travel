import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import type { CrmTaskWithRelations, CreateTaskData } from '@/types/crm';

/**
 * GET /api/admin/crm/tasks
 * List all CRM tasks with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assignedTo = searchParams.get('assigned_to');
  const contactId = searchParams.get('contact_id');
  const dealId = searchParams.get('deal_id');
  const overdue = searchParams.get('overdue') === 'true';
  const dueToday = searchParams.get('due_today') === 'true';
  const upcoming = searchParams.get('upcoming') === 'true';

  // Build WHERE clause
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (priority) {
    conditions.push(`t.priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  if (assignedTo) {
    conditions.push(`t.assigned_to = $${paramIndex}`);
    params.push(parseInt(assignedTo));
    paramIndex++;
  }

  if (contactId) {
    conditions.push(`t.contact_id = $${paramIndex}`);
    params.push(parseInt(contactId));
    paramIndex++;
  }

  if (dealId) {
    conditions.push(`t.deal_id = $${paramIndex}`);
    params.push(parseInt(dealId));
    paramIndex++;
  }

  if (overdue) {
    conditions.push(`t.due_date < CURRENT_DATE AND t.status IN ('pending', 'in_progress')`);
  }

  if (dueToday) {
    conditions.push(`t.due_date = CURRENT_DATE AND t.status IN ('pending', 'in_progress')`);
  }

  if (upcoming) {
    conditions.push(`t.due_date > CURRENT_DATE AND t.due_date <= CURRENT_DATE + INTERVAL '7 days' AND t.status IN ('pending', 'in_progress')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get tasks with relations
  const result = await query<CrmTaskWithRelations>(
    `SELECT
      t.*,
      c.name as contact_name,
      c.email as contact_email,
      d.title as deal_title,
      u1.name as assigned_user_name,
      u2.name as created_by_name
    FROM crm_tasks t
    LEFT JOIN crm_contacts c ON t.contact_id = c.id
    LEFT JOIN crm_deals d ON t.deal_id = d.id
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    ${whereClause}
    ORDER BY
      CASE WHEN t.status IN ('pending', 'in_progress') AND t.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
      t.due_date ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`,
    params
  );

  // Get counts for badges
  const countsResult = await query<{
    overdue: string;
    due_today: string;
    upcoming: string;
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status IN ('pending', 'in_progress')) as overdue,
      COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND status IN ('pending', 'in_progress')) as due_today,
      COUNT(*) FILTER (WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND status IN ('pending', 'in_progress')) as upcoming
    FROM crm_tasks`,
    []
  );

  const counts = countsResult.rows[0];

  return NextResponse.json({
    success: true,
    tasks: result.rows,
    overdue: parseInt(counts?.overdue || '0'),
    dueToday: parseInt(counts?.due_today || '0'),
    upcoming: parseInt(counts?.upcoming || '0'),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/crm/tasks
 * Create a new CRM task
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json() as CreateTaskData;

  // Validate required fields
  if (!body.title || !body.due_date || !body.assigned_to) {
    throw new BadRequestError('title, due_date, and assigned_to are required');
  }

  // At least one of contact_id or deal_id must be provided
  if (!body.contact_id && !body.deal_id) {
    throw new BadRequestError('Either contact_id or deal_id must be provided');
  }

  // If deal_id is provided but not contact_id, get contact_id from deal
  let contactId = body.contact_id;
  if (body.deal_id && !contactId) {
    const dealResult = await query<{ contact_id: number }>(
      `SELECT contact_id FROM crm_deals WHERE id = $1`,
      [body.deal_id]
    );
    if (dealResult.rows.length > 0) {
      contactId = dealResult.rows[0].contact_id;
    }
  }

  // Build insert query
  const fields: string[] = ['title', 'due_date', 'assigned_to', 'created_by'];
  const values: unknown[] = [body.title, body.due_date, body.assigned_to, session.user.id];
  let paramIndex = 5;

  if (contactId) {
    fields.push('contact_id');
    values.push(contactId);
    paramIndex++;
  }

  const optionalFields: (keyof CreateTaskData)[] = [
    'deal_id', 'description', 'task_type', 'priority', 'due_time', 'reminder_at'
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
    `INSERT INTO crm_tasks (${fields.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );

  const task = result.rows[0];

  // Update contact's next_follow_up_at if this is the earliest pending task
  if (contactId) {
    await query(
      `UPDATE crm_contacts
       SET next_follow_up_at = (
         SELECT MIN(due_date)
         FROM crm_tasks
         WHERE contact_id = $1 AND status IN ('pending', 'in_progress')
       )
       WHERE id = $1`,
      [contactId]
    );
  }

  return NextResponse.json({
    success: true,
    task,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/crm/tasks
 * Update a task (complete, reschedule, etc.)
 */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json();
  const { taskId, status, completion_notes, ...updates } = body;

  if (!taskId) {
    throw new BadRequestError('taskId is required');
  }

  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Handle status change
  if (status) {
    updateFields.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    if (status === 'completed') {
      updateFields.push(`completed_at = NOW()`);
      updateFields.push(`completed_by = $${paramIndex}`);
      params.push(session.user.id);
      paramIndex++;

      if (completion_notes) {
        updateFields.push(`completion_notes = $${paramIndex}`);
        params.push(completion_notes);
        paramIndex++;
      }
    }
  }

  // Handle other updates
  const allowedFields = ['title', 'description', 'task_type', 'priority', 'due_date', 'due_time', 'reminder_at', 'assigned_to'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex}`);
      params.push(updates[field]);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new BadRequestError('No updates provided');
  }

  params.push(taskId);

  const result = await query(
    `UPDATE crm_tasks
     SET ${updateFields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new BadRequestError('Task not found');
  }

  const task = result.rows[0];

  // Update contact's next_follow_up_at
  if (task.contact_id) {
    await query(
      `UPDATE crm_contacts
       SET next_follow_up_at = (
         SELECT MIN(due_date)
         FROM crm_tasks
         WHERE contact_id = $1 AND status IN ('pending', 'in_progress')
       )
       WHERE id = $1`,
      [task.contact_id]
    );
  }

  return NextResponse.json({
    success: true,
    task,
    timestamp: new Date().toISOString(),
  });
});
