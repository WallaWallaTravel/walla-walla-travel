import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler'

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

// GET - Export leads as CSV (now from crm_contacts)
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const temperature = searchParams.get('temperature')
  const source = searchParams.get('source')
  const format = searchParams.get('format') || 'csv'

  let queryText = `
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
      c.next_follow_up_at as next_followup_at,
      c.last_contacted_at as last_contact_at,
      c.created_at,
      d.party_size as party_size_estimate,
      d.expected_tour_date as estimated_date,
      d.estimated_value as budget_estimate
    FROM crm_contacts c
    LEFT JOIN LATERAL (
      SELECT party_size, expected_tour_date, estimated_value
      FROM crm_deals
      WHERE contact_id = c.id AND won_at IS NULL AND lost_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) d ON true
    WHERE c.lifecycle_stage IN ('lead', 'qualified', 'opportunity')
  `
  const params: string[] = []
  let paramIndex = 1

  // Map legacy status filter to lifecycle_stage
  if (status && status !== 'all') {
    const lifecycleMapping: Record<string, string[]> = {
      'new': ['lead'],
      'contacted': ['lead'],
      'qualified': ['qualified'],
      'proposal_sent': ['opportunity'],
      'negotiating': ['opportunity'],
      'won': ['customer', 'repeat_customer'],
      'lost': ['lost'],
    }
    const stages = lifecycleMapping[status] || ['lead']
    queryText += ` AND c.lifecycle_stage = ANY($${paramIndex++}::text[])`
    params.push(stages as unknown as string)
  }

  if (temperature) {
    queryText += ` AND c.lead_temperature = $${paramIndex++}`
    params.push(temperature)
  }

  if (source) {
    queryText += ` AND c.source = $${paramIndex++}`
    params.push(source)
  }

  queryText += ` ORDER BY c.created_at DESC`

  const result = await query(queryText, params)

  // Transform rows to legacy format
  const leads = result.rows.map(row => {
    const nameParts = (row.name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    return {
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
      interested_services: row.source_detail || '',
      party_size_estimate: row.party_size_estimate,
      estimated_date: row.estimated_date,
      budget_range: row.budget_estimate ? `$${row.budget_estimate}` : '',
      first_contact_at: row.created_at,
      last_contact_at: row.last_contact_at,
      next_followup_at: row.next_followup_at,
      notes: row.notes,
      created_at: row.created_at,
    }
  })

  if (format === 'json') {
    return NextResponse.json({
      leads,
      total: leads.length,
      exported_at: new Date().toISOString()
    })
  }

  // Generate CSV
  const headers = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company',
    'Source', 'Status', 'Temperature', 'Score', 'Interested Services',
    'Party Size', 'Estimated Date', 'Budget Range',
    'First Contact', 'Last Contact', 'Next Followup', 'Notes', 'Created At'
  ]

  const csvRows = [
    headers.join(','),
    ...leads.map(row => [
      row.id,
      `"${(row.first_name || '').replace(/"/g, '""')}"`,
      `"${(row.last_name || '').replace(/"/g, '""')}"`,
      `"${(row.email || '').replace(/"/g, '""')}"`,
      `"${(row.phone || '').replace(/"/g, '""')}"`,
      `"${(row.company || '').replace(/"/g, '""')}"`,
      row.source || '',
      row.status || '',
      row.temperature || '',
      row.score || 0,
      `"${(row.interested_services || '').replace(/"/g, '""')}"`,
      row.party_size_estimate || '',
      row.estimated_date || '',
      `"${(row.budget_range || '').replace(/"/g, '""')}"`,
      row.first_contact_at || '',
      row.last_contact_at || '',
      row.next_followup_at || '',
      `"${(row.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      row.created_at
    ].join(','))
  ]

  const csv = csvRows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

export const GET = withErrorHandling(getHandler)
