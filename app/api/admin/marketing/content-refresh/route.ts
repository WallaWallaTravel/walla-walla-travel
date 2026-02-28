/**
 * Admin API: Content Refresh Suggestions
 *
 * GET  - List content refresh suggestions (filter by status, urgency)
 * PUT  - Update suggestion status (approve, apply, dismiss)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

// GET - List content refresh suggestions
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const urgency = searchParams.get('urgency')
  const reason = searchParams.get('reason')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  let queryText = `
    SELECT
      id, page_path, page_title, reason,
      current_content, suggested_update, urgency,
      last_modified, days_since_update, impressions_trend,
      status, applied_at, applied_by,
      created_at, updated_at
    FROM content_refresh_suggestions
    WHERE 1=1
  `
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM content_refresh_suggestions
    WHERE 1=1
  `

  const params: (string | number)[] = []
  const countParams: (string | number)[] = []
  let paramIndex = 1
  let filterClause = ''

  if (status !== 'all') {
    filterClause += ` AND status = $${paramIndex++}`
    params.push(status)
    countParams.push(status)
  }

  if (urgency) {
    filterClause += ` AND urgency = $${paramIndex++}`
    params.push(urgency)
    countParams.push(urgency)
  }

  if (reason) {
    filterClause += ` AND reason = $${paramIndex++}`
    params.push(reason)
    countParams.push(reason)
  }

  queryText += filterClause
  queryText += ` ORDER BY
    CASE urgency
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END ASC,
    created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `
  params.push(limit, offset)

  const fullCountQuery = countQuery + filterClause

  const [suggestionsResult, countResult] = await Promise.all([
    query(queryText, params),
    query<{ total: number }>(fullCountQuery, countParams),
  ])

  const total = countResult.rows[0]?.total || 0

  const statsResult = await query<{
    status: string
    urgency: string
    count: number
  }>(`
    SELECT status, urgency, COUNT(*)::int as count
    FROM content_refresh_suggestions
    GROUP BY status, urgency
    ORDER BY status, urgency
  `)

  const stats = {
    by_status: {} as Record<string, number>,
    by_urgency: {} as Record<string, number>,
  }

  for (const row of statsResult.rows) {
    stats.by_status[row.status] = (stats.by_status[row.status] || 0) + row.count
    stats.by_urgency[row.urgency] = (stats.by_urgency[row.urgency] || 0) + row.count
  }

  return NextResponse.json({
    suggestions: suggestionsResult.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    stats,
  })
});

// PUT - Update suggestion status
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id) {
    return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 })
  }

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const validStatuses = ['pending', 'approved', 'applied', 'dismissed']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const setClauses = ['status = $2', 'updated_at = NOW()']
  const params: (string | number | null)[] = [id, status]

  if (status === 'applied') {
    setClauses.push('applied_at = NOW()')
    setClauses.push(`applied_by = $${params.length + 1}`)
    params.push(session.user.id)
  }

  if (status === 'dismissed' || status === 'pending') {
    setClauses.push('applied_at = NULL')
    setClauses.push('applied_by = NULL')
  }

  const result = await query(`
    UPDATE content_refresh_suggestions
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING *
  `, params)

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Content refresh suggestion not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    suggestion: result.rows[0],
  })
});
