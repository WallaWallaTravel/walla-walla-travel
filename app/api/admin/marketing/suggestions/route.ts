import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'

// GET - Fetch pending content suggestions
const getHandler = withAdminAuth(async (request: NextRequest, _session) => {
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
})

// PATCH - Update suggestion status
const patchHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json()
  const { id, status, scheduled_post_id, suggested_media_urls, media_source } = body

  if (!id) {
    throw new BadRequestError('Suggestion ID is required')
  }

  // Allow media-only updates (no status change required)
  const setClause = ['updated_at = NOW()']
  const params: (string | number | string[])[] = [id]

  if (status) {
    const validStatuses = ['pending', 'accepted', 'modified', 'dismissed', 'expired']
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }
    params.push(status)
    setClause.push(`status = $${params.length}`)

    if (status === 'accepted' || status === 'modified') {
      setClause.push('accepted_at = NOW()')
    }
  }

  if (scheduled_post_id) {
    params.push(scheduled_post_id)
    setClause.push(`scheduled_post_id = $${params.length}`)
  }

  if (suggested_media_urls) {
    params.push(suggested_media_urls)
    setClause.push(`suggested_media_urls = $${params.length}`)
  }

  if (media_source) {
    params.push(media_source)
    setClause.push(`media_source = $${params.length}`)
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
})

export const GET = getHandler
export const PATCH = patchHandler
