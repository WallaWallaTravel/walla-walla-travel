import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

// GET - Fetch activities for a lead
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const result = await query(`
    SELECT
      la.*,
      u.name as performed_by_name
    FROM lead_activities la
    LEFT JOIN users u ON la.performed_by = u.id
    WHERE la.lead_id = $1
    ORDER BY la.created_at DESC
    LIMIT $2 OFFSET $3
  `, [id, limit, offset])

  const countResult = await query(
    'SELECT COUNT(*) FROM lead_activities WHERE lead_id = $1',
    [id]
  )

  return NextResponse.json({
    activities: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset
  })
}

// POST - Log new activity
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)
  const body = await request.json()

  const {
    activity_type,
    description,
    metadata,
    performed_by
  } = body

  // Validate activity type
  const validTypes = [
    'email_sent', 'email_opened', 'email_clicked',
    'call_made', 'call_received', 'meeting',
    'note_added', 'status_changed', 'proposal_sent',
    'website_visit', 'form_submitted'
  ]

  if (!activity_type || !validTypes.includes(activity_type)) {
    throw new BadRequestError('Invalid or missing activity type')
  }

  const result = await query(`
    INSERT INTO lead_activities (
      lead_id, activity_type, description, metadata, performed_by, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `, [
    id,
    activity_type,
    description || null,
    metadata ? JSON.stringify(metadata) : null,
    performed_by || null
  ])

  // Update last_contact_at on the lead for certain activities
  const contactActivities = ['email_sent', 'call_made', 'call_received', 'meeting']
  if (contactActivities.includes(activity_type)) {
    await query(`
      UPDATE leads
      SET last_contact_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [id])
  }

  return NextResponse.json({
    success: true,
    activity: result.rows[0]
  })
}

export const GET = withErrorHandling(getHandler)
export const POST = withErrorHandling(postHandler)
