import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, BadRequestError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import type { CrmTaskWithRelations, UpdateTaskData } from '@/types/crm';

interface RouteParams {
  id: string;
}

/**
 * GET /api/admin/crm/tasks/[id]
 * Get a single task with details
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
  const taskId = parseInt(id);

  if (isNaN(taskId)) {
    throw new BadRequestError('Invalid task ID');
  }

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
    WHERE t.id = $1`,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task not found');
  }

  return NextResponse.json({
    success: true,
    task: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/crm/tasks/[id]
 * Update a task
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
  const taskId = parseInt(id);

  if (isNaN(taskId)) {
    throw new BadRequestError('Invalid task ID');
  }

  const body = await request.json() as UpdateTaskData;

  // Build update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Handle status change specially
  if (body.status) {
    updates.push(`status = $${paramIndex}`);
    params.push(body.status);
    paramIndex++;

    if (body.status === 'completed') {
      updates.push(`completed_at = NOW()`);
      updates.push(`completed_by = $${paramIndex}`);
      params.push(session.user.id);
      paramIndex++;

      if (body.completion_notes) {
        updates.push(`completion_notes = $${paramIndex}`);
        params.push(body.completion_notes);
        paramIndex++;
      }
    }
  }

  const allowedFields: (keyof UpdateTaskData)[] = [
    'title', 'description', 'task_type', 'priority', 'due_date', 'due_time', 'reminder_at'
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

  params.push(taskId);

  const result = await query(
    `UPDATE crm_tasks
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task not found');
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

/**
 * DELETE /api/admin/crm/tasks/[id]
 * Delete a task
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
  const taskId = parseInt(id);

  if (isNaN(taskId)) {
    throw new BadRequestError('Invalid task ID');
  }

  // Get task to find contact_id for updating follow-up date
  const taskResult = await query<{ contact_id: number | null }>(
    `SELECT contact_id FROM crm_tasks WHERE id = $1`,
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    throw new NotFoundError('Task not found');
  }

  const contactId = taskResult.rows[0].contact_id;

  // Delete the task
  await query(
    `DELETE FROM crm_tasks WHERE id = $1`,
    [taskId]
  );

  // Update contact's next_follow_up_at
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
    message: 'Task deleted',
    timestamp: new Date().toISOString(),
  });
});
