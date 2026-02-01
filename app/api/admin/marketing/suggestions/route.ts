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

// GET - Fetch pending content suggestions
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const platform = searchParams.get('platform')
  const limit = parseInt(searchParams.get('limit') || '20')

  let queryText = `
    SELECT
      id,
      suggestion_date,
      platform,
      content_type,
      winery_id,
      winery_name,
      suggested_content,
      suggested_hashtags,
      suggested_time,
      reasoning,
      data_sources,
      priority,
      suggested_media_urls,
      media_source,
      image_search_query,
      status,
      scheduled_post_id,
      created_at
    FROM content_suggestions
    WHERE 1=1
  `
  const params: (string | number)[] = []
  let paramIndex = 1

  if (status !== 'all') {
    queryText += ` AND status = $${paramIndex++}`
    params.push(status)
  }

  if (platform) {
    queryText += ` AND platform = $${paramIndex++}`
    params.push(platform)
  }

  // Only show suggestions from last 7 days
  queryText += ` AND suggestion_date >= CURRENT_DATE - INTERVAL '7 days'`

  queryText += ` ORDER BY priority DESC, suggestion_date DESC LIMIT $${paramIndex++}`
  params.push(limit)

  const result = await query(queryText, params)

  return NextResponse.json({
    suggestions: result.rows,
    total: result.rows.length
  })
}

// PATCH - Update suggestion status
async function patchHandler(request: NextRequest) {
  await verifyAdmin(request)

  const body = await request.json()
  const { id, status, scheduled_post_id } = body

  if (!id) {
    throw new BadRequestError('Suggestion ID is required')
  }

  if (!status) {
    throw new BadRequestError('Status is required')
  }

  const validStatuses = ['pending', 'accepted', 'modified', 'dismissed', 'expired']
  if (!validStatuses.includes(status)) {
    throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  const setClause = ['status = $2', 'updated_at = NOW()']
  const params: (string | number)[] = [id, status]

  if (status === 'accepted' || status === 'modified') {
    setClause.push('accepted_at = NOW()')
  }

  if (scheduled_post_id) {
    params.push(scheduled_post_id)
    setClause.push(`scheduled_post_id = $${params.length}`)
  }

  const result = await query(`
    UPDATE content_suggestions
    SET ${setClause.join(', ')}
    WHERE id = $1
    RETURNING *
  `, params)

  if (result.rows.length === 0) {
    throw new NotFoundError('Suggestion not found')
  }

  return NextResponse.json({
    success: true,
    suggestion: result.rows[0]
  })
}

export const GET = withErrorHandling(getHandler)
export const PATCH = withErrorHandling(patchHandler)
