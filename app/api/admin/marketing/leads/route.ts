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

// GET - Fetch leads with filtering
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const temperature = searchParams.get('temperature')
  const source = searchParams.get('source')
  const assigned_to = searchParams.get('assigned_to')

  let queryText = `
    SELECT
      l.*,
      u.name as assigned_to_name
    FROM leads l
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE 1=1
  `
  const params: (string | number)[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND l.status = $${paramIndex++}`
    params.push(status)
  }

  if (temperature) {
    queryText += ` AND l.temperature = $${paramIndex++}`
    params.push(temperature)
  }

  if (source) {
    queryText += ` AND l.source = $${paramIndex++}`
    params.push(source)
  }

  if (assigned_to) {
    queryText += ` AND l.assigned_to = $${paramIndex++}`
    params.push(parseInt(assigned_to))
  }

  queryText += ` ORDER BY
    CASE l.temperature WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
    l.score DESC,
    l.created_at DESC
  `

  const result = await query(queryText, params)

  return NextResponse.json({
    leads: result.rows,
    total: result.rows.length
  })
}

// POST - Create new lead
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

  const result = await query(`
    INSERT INTO leads (
      first_name, last_name, email, phone, company,
      source, interested_services, party_size_estimate,
      estimated_date, budget_range, notes, assigned_to,
      score, temperature, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'new', NOW(), NOW()
    ) RETURNING *
  `, [
    first_name,
    last_name || null,
    email,
    phone || null,
    company || null,
    source || 'website',
    interested_services || [],
    party_size_estimate || null,
    estimated_date || null,
    budget_range || null,
    notes || null,
    assigned_to || null,
    score,
    temperature
  ])

  return NextResponse.json({
    success: true,
    lead: result.rows[0]
  })
}

export const GET = withErrorHandling(getHandler)
export const POST = withErrorHandling(postHandler)
