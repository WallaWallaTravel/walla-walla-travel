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

// GET - Fetch competitors with change counts
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const priority = searchParams.get('priority')
  const active_only = searchParams.get('active_only') !== 'false'

  let queryText = `
    SELECT
      c.*,
      COUNT(cc.id) FILTER (WHERE cc.status = 'new') as unreviewed_changes
    FROM competitors c
    LEFT JOIN competitor_changes cc ON c.id = cc.competitor_id
    WHERE 1=1
  `
  const params: string[] = []
  let paramIndex = 1

  if (active_only) {
    queryText += ` AND c.is_active = TRUE`
  }

  if (priority) {
    queryText += ` AND c.priority_level = $${paramIndex++}`
    params.push(priority)
  }

  queryText += `
    GROUP BY c.id
    ORDER BY
      CASE c.priority_level
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      c.name
  `

  const result = await query(queryText, params)

  return NextResponse.json({
    competitors: result.rows,
    total: result.rows.length
  })
}

// POST - Add new competitor
async function postHandler(request: NextRequest) {
  await verifyAdmin(request)

  const body = await request.json()

  const {
    name,
    website_url,
    description,
    priority_level,
    check_frequency,
    monitor_pricing,
    monitor_promotions,
    monitor_packages,
    monitor_content,
    email_recipients
  } = body

  // Validation
  if (!name || !website_url) {
    throw new BadRequestError('Name and website URL are required')
  }

  const result = await query(`
    INSERT INTO competitors (
      name, website_url, description, priority_level,
      check_frequency, monitor_pricing, monitor_promotions,
      monitor_packages, monitor_content, email_recipients,
      is_active, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW()
    ) RETURNING *
  `, [
    name,
    website_url,
    description || null,
    priority_level || 'medium',
    check_frequency || 'every_6_hours',
    monitor_pricing !== false,
    monitor_promotions !== false,
    monitor_packages !== false,
    monitor_content !== false,
    email_recipients || []
  ])

  return NextResponse.json({
    success: true,
    competitor: result.rows[0]
  })
}

export const GET = withErrorHandling(getHandler)
export const POST = withErrorHandling(postHandler)
