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

// GET - Fetch leads with filtering (now from crm_contacts)
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const temperature = searchParams.get('temperature')
  const source = searchParams.get('source')
  const assigned_to = searchParams.get('assigned_to')

  // Query CRM contacts that are leads (not yet customers)
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
      c.assigned_to,
      c.next_follow_up_at as next_followup_at,
      c.last_contacted_at as last_contact_at,
      c.created_at,
      c.updated_at,
      u.name as assigned_to_name,
      -- Get deal info if exists
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
    WHERE c.lifecycle_stage IN ('lead', 'qualified', 'opportunity')
  `
  const params: (string | number)[] = []
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

  if (assigned_to) {
    queryText += ` AND c.assigned_to = $${paramIndex++}`
    params.push(parseInt(assigned_to))
  }

  queryText += ` ORDER BY
    CASE c.lead_temperature WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
    c.lead_score DESC,
    c.created_at DESC
  `

  const result = await query(queryText, params)

  // Transform results to match the expected Lead format
  const leads = result.rows.map(row => {
    // Split name into first_name and last_name
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
      interested_services: [], // Not stored in CRM contacts - would need separate table
      party_size_estimate: row.party_size_estimate,
      estimated_date: row.estimated_date,
      budget_range: row.budget_estimate ? `$${row.budget_estimate}` : null,
      next_followup_at: row.next_followup_at,
      last_contact_at: row.last_contact_at,
      notes: row.notes,
      assigned_to: row.assigned_to,
      assigned_to_name: row.assigned_to_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Extra fields from CRM
      deal_title: row.deal_title,
      source_detail: row.source_detail,
    }
  })

  return NextResponse.json({
    leads,
    total: leads.length
  })
}

// POST - Create new lead (now creates CRM contact)
async function postHandler(request: NextRequest) {
  await verifyAdmin(request)

  const body = await request.json()

  const {
    first_name,
    last_name,
    email,
    phone,
    company,
    source,
    interested_services,
    party_size_estimate,
    estimated_date,
    budget_range,
    notes,
    assigned_to
  } = body

  // Basic validation
  if (!first_name || !email) {
    throw new BadRequestError('First name and email are required')
  }

  // Calculate initial score based on data completeness
  let score = 20 // base score
  if (phone) score += 10
  if (company) score += 10
  if (interested_services?.length > 0) score += 15
  if (party_size_estimate) score += 10
  if (estimated_date) score += 15
  if (budget_range) score += 10
  if (notes) score += 10

  // Determine temperature based on score
  let temperature: 'hot' | 'warm' | 'cold' = 'cold'
  if (score >= 70) temperature = 'hot'
  else if (score >= 50) temperature = 'warm'

  const fullName = [first_name, last_name].filter(Boolean).join(' ')

  // Create CRM contact
  const contactResult = await query(`
    INSERT INTO crm_contacts (
      email, name, phone, company, contact_type, lifecycle_stage,
      lead_score, lead_temperature, source, source_detail, notes, assigned_to
    ) VALUES ($1, $2, $3, $4, $5, 'lead', $6, $7, $8, $9, $10, $11)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      phone = COALESCE(EXCLUDED.phone, crm_contacts.phone),
      company = COALESCE(EXCLUDED.company, crm_contacts.company),
      lead_score = GREATEST(crm_contacts.lead_score, EXCLUDED.lead_score),
      lead_temperature = CASE
        WHEN EXCLUDED.lead_temperature = 'hot' THEN 'hot'
        WHEN crm_contacts.lead_temperature = 'hot' THEN 'hot'
        WHEN EXCLUDED.lead_temperature = 'warm' THEN 'warm'
        ELSE crm_contacts.lead_temperature
      END,
      notes = COALESCE(EXCLUDED.notes, crm_contacts.notes),
      updated_at = NOW()
    RETURNING *
  `, [
    email,
    fullName,
    phone || null,
    company || null,
    company ? 'corporate' : 'individual',
    score,
    temperature,
    source || 'website',
    interested_services?.join(', ') || null,
    notes || null,
    assigned_to || null
  ])

  const contact = contactResult.rows[0]

  // If party size or estimated date provided, create a deal
  if (party_size_estimate || estimated_date || budget_range) {
    // Get default pipeline stage
    const stageResult = await query(`
      SELECT ps.id
      FROM crm_pipeline_stages ps
      JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
      WHERE (pt.brand = 'walla_walla_travel' OR pt.brand IS NULL)
        AND ps.is_won = false AND ps.is_lost = false
      ORDER BY pt.is_default DESC, ps.sort_order ASC
      LIMIT 1
    `)

    if (stageResult.rows.length > 0) {
      // Parse budget range to get estimated value
      let estimatedValue: number | null = null
      if (budget_range) {
        const match = budget_range.match(/\$?([\d,]+)/)
        if (match) {
          estimatedValue = parseInt(match[1].replace(/,/g, ''))
        }
      }

      await query(`
        INSERT INTO crm_deals (
          contact_id, stage_id, brand, title, description,
          party_size, expected_tour_date, estimated_value
        ) VALUES ($1, $2, 'walla_walla_travel', $3, $4, $5, $6, $7)
      `, [
        contact.id,
        stageResult.rows[0].id,
        `Lead - ${fullName}`,
        interested_services?.join(', ') || notes || 'New lead',
        party_size_estimate || null,
        estimated_date || null,
        estimatedValue
      ])
    }
  }

  // Transform to match expected lead format
  const nameParts = fullName.split(' ')
  const lead = {
    id: contact.id,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    source: contact.source,
    status: 'new',
    temperature: contact.lead_temperature,
    score: contact.lead_score,
    interested_services: interested_services || [],
    party_size_estimate,
    estimated_date,
    budget_range,
    notes: contact.notes,
    assigned_to: contact.assigned_to,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  }

  return NextResponse.json({
    success: true,
    lead
  })
}

export const GET = withErrorHandling(getHandler)
export const POST = withErrorHandling(postHandler)
