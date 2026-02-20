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

/**
 * Map CRM lifecycle_stage to legacy lead status
 */
function mapLifecycleToStatus(lifecycle: string): string {
  const mapping: Record<string, string> = {
    'lead': 'new',
    'qualified': 'qualified',
    'opportunity': 'proposal_sent',
    'customer': 'won',
    'repeat_customer': 'won',
    'lost': 'lost',
  }
  return mapping[lifecycle] || 'new'
}

/**
 * Map legacy lead status to CRM lifecycle_stage
 */
function mapStatusToLifecycle(status: string): string {
  const mapping: Record<string, string> = {
    'new': 'lead',
    'contacted': 'lead',
    'qualified': 'qualified',
    'proposal_sent': 'opportunity',
    'negotiating': 'opportunity',
    'won': 'customer',
    'lost': 'lost',
  }
  return mapping[status] || 'lead'
}

// GET - Fetch single lead with activities (now from crm_contacts + crm_activities)
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)

  // Get lead details from crm_contacts
  const leadResult = await query(`
    SELECT
      c.id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.source,
      c.source_detail,
      c.lifecycle_stage,
      c.lead_temperature as temperature,
      c.lead_score as score,
      c.notes,
      c.assigned_to,
      c.next_follow_up_at as next_followup_at,
      c.last_contacted_at as last_contact_at,
      c.created_at,
      c.updated_at,
      u.name as assigned_to_name,
      u.email as assigned_to_email,
      d.party_size as party_size_estimate,
      d.expected_tour_date as estimated_date,
      d.estimated_value as budget_estimate,
      d.title as deal_title
    FROM crm_contacts c
    LEFT JOIN users u ON c.assigned_to = u.id
    LEFT JOIN LATERAL (
      SELECT party_size, expected_tour_date, estimated_value, title
      FROM crm_deals
      WHERE contact_id = c.id AND won_at IS NULL AND lost_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) d ON true
    WHERE c.id = $1
  `, [id])

  if (leadResult.rows.length === 0) {
    throw new NotFoundError('Lead not found')
  }

  const row = leadResult.rows[0]

  // Split name into first_name and last_name for API compatibility
  const nameParts = (row.name || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const lead = {
    id: row.id,
    first_name: firstName,
    last_name: lastName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source || 'website',
    status: mapLifecycleToStatus(row.lifecycle_stage),
    temperature: row.temperature || 'cold',
    score: row.score || 0,
    interested_services: [],
    party_size_estimate: row.party_size_estimate,
    estimated_date: row.estimated_date,
    budget_range: row.budget_estimate ? `$${row.budget_estimate}` : null,
    next_followup_at: row.next_followup_at,
    last_contact_at: row.last_contact_at,
    notes: row.notes,
    assigned_to: row.assigned_to,
    assigned_to_name: row.assigned_to_name,
    assigned_to_email: row.assigned_to_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deal_title: row.deal_title,
    source_detail: row.source_detail,
  }

  // Get activities from crm_activities
  const activitiesResult = await query(`
    SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.contact_id = $1
    ORDER BY a.created_at DESC
    LIMIT 50
  `, [id])

  return NextResponse.json({
    lead,
    activities: activitiesResult.rows
  })
}

// PATCH - Update lead (now updates crm_contacts)
async function patchHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)
  const body = await request.json()

  // Map incoming legacy field names to CRM column names
  const fieldMapping: Record<string, string> = {
    'email': 'email',
    'phone': 'phone',
    'company': 'company',
    'notes': 'notes',
    'assigned_to': 'assigned_to',
    'tags': 'tags',
    'temperature': 'lead_temperature',
    'score': 'lead_score',
    'next_followup_at': 'next_follow_up_at',
  }

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'company',
    'status', 'temperature', 'score', 'assigned_to',
    'interested_services', 'party_size_estimate', 'estimated_date',
    'budget_range', 'next_followup_at', 'notes', 'tags'
  ]

  const updates: string[] = []
  const values: (string | number | string[] | null)[] = []
  let paramIndex = 1

  // Handle name: combine first_name + last_name into name
  if (body.first_name !== undefined || body.last_name !== undefined) {
    // We need the current name to merge partial updates
    const currentResult = await query('SELECT name FROM crm_contacts WHERE id = $1', [id])
    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Lead not found')
    }
    const currentParts = (currentResult.rows[0].name || '').split(' ')
    const currentFirst = currentParts[0] || ''
    const currentLast = currentParts.slice(1).join(' ') || ''

    const newFirst = body.first_name !== undefined ? body.first_name : currentFirst
    const newLast = body.last_name !== undefined ? body.last_name : currentLast
    const fullName = [newFirst, newLast].filter(Boolean).join(' ')

    updates.push(`name = $${paramIndex++}`)
    values.push(fullName)
  }

  // Handle status -> lifecycle_stage
  if (body.status) {
    updates.push(`lifecycle_stage = $${paramIndex++}`)
    values.push(mapStatusToLifecycle(body.status))
  }

  // Handle remaining mapped fields
  for (const [key, value] of Object.entries(body)) {
    if (!allowedFields.includes(key)) continue
    // Skip fields already handled above
    if (['first_name', 'last_name', 'status', 'interested_services', 'party_size_estimate', 'estimated_date', 'budget_range'].includes(key)) continue

    const crmColumn = fieldMapping[key]
    if (crmColumn) {
      updates.push(`${crmColumn} = $${paramIndex++}`)
      values.push(value as string | number | string[] | null)
    }
  }

  if (updates.length === 0) {
    throw new BadRequestError('No valid fields to update')
  }

  updates.push(`updated_at = NOW()`)
  values.push(id)

  const result = await query(`
    UPDATE crm_contacts
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead not found')
  }

  const row = result.rows[0]

  // Transform to legacy format for API response
  const nameParts = (row.name || '').split(' ')
  const lead = {
    id: row.id,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source || 'website',
    status: mapLifecycleToStatus(row.lifecycle_stage),
    temperature: row.lead_temperature || 'cold',
    score: row.lead_score || 0,
    notes: row.notes,
    assigned_to: row.assigned_to,
    next_followup_at: row.next_follow_up_at,
    last_contact_at: row.last_contacted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  // Log status change activity if status was updated
  if (body.status) {
    await query(`
      INSERT INTO crm_activities (
        contact_id, activity_type, description, metadata, created_at
      ) VALUES ($1, 'status_changed', $2, $3, NOW())
    `, [
      id,
      `Status changed to ${body.status}`,
      JSON.stringify({ new_status: body.status, new_lifecycle_stage: mapStatusToLifecycle(body.status) })
    ])
  }

  return NextResponse.json({
    success: true,
    lead
  })
}

// DELETE - Delete lead (now deletes from crm_contacts)
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  await verifyAdmin(request)

  const { lead_id } = await params
  const id = parseInt(lead_id)

  await query('DELETE FROM crm_contacts WHERE id = $1', [id])

  return NextResponse.json({
    success: true,
    message: 'Lead deleted successfully'
  })
}

export const GET = withErrorHandling(getHandler)
export const PATCH = withErrorHandling(patchHandler)
export const DELETE = withErrorHandling(deleteHandler)
