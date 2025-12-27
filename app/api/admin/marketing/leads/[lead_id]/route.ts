import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

// GET - Fetch single lead with activities
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)

  // Get lead details
  const leadResult = await query(`
    SELECT
      l.*,
      u.name as assigned_to_name,
      u.email as assigned_to_email
    FROM leads l
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.id = $1
  `, [id])

  if (leadResult.rows.length === 0) {
    throw new NotFoundError('Lead not found')
  }

  // Get activities
  const activitiesResult = await query(`
    SELECT
      la.*,
      u.name as performed_by_name
    FROM lead_activities la
    LEFT JOIN users u ON la.performed_by = u.id
    WHERE la.lead_id = $1
    ORDER BY la.created_at DESC
    LIMIT 50
  `, [id])

  return NextResponse.json({
    lead: leadResult.rows[0],
    activities: activitiesResult.rows
  })
}

// PATCH - Update lead
async function patchHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)
  const body = await request.json()

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'company',
    'status', 'temperature', 'score', 'assigned_to',
    'interested_services', 'party_size_estimate', 'estimated_date',
    'budget_range', 'next_followup_at', 'notes', 'tags'
  ]

  const updates: string[] = []
  const values: (string | number | string[] | null)[] = []
  let paramIndex = 1

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramIndex++}`)
      values.push(value as string | number | string[] | null)
    }
  }

  if (updates.length === 0) {
    throw new BadRequestError('No valid fields to update')
  }

  updates.push(`updated_at = NOW()`)
  values.push(id)

  const result = await query(`
    UPDATE leads
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead not found')
  }

  // Log status change activity if status was updated
  if (body.status) {
    await query(`
      INSERT INTO lead_activities (
        lead_id, activity_type, description, metadata, created_at
      ) VALUES ($1, 'status_changed', $2, $3, NOW())
    `, [
      id,
      `Status changed to ${body.status}`,
      JSON.stringify({ new_status: body.status })
    ])
  }

  return NextResponse.json({
    success: true,
    lead: result.rows[0]
  })
}

// DELETE - Delete lead
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)

  await query('DELETE FROM leads WHERE id = $1', [id])

  return NextResponse.json({
    success: true,
    message: 'Lead deleted successfully'
  })
}

export const GET = withErrorHandling(getHandler)
export const PATCH = withErrorHandling(patchHandler)
export const DELETE = withErrorHandling(deleteHandler)
