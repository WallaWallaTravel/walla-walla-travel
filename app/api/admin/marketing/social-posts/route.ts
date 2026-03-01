import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'

// GET - Fetch scheduled posts
const getHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const platform = searchParams.get('platform')
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  let queryText = `
    SELECT
      sp.*,
      sa.account_name,
      u.name as created_by_name
    FROM scheduled_posts sp
    LEFT JOIN social_accounts sa ON sp.account_id = sa.id
    LEFT JOIN users u ON sp.created_by = u.id
    WHERE 1=1
  `
  const params: (string | number)[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND sp.status = $${paramIndex++}`
    params.push(status)
  }

  if (platform && platform !== 'all') {
    queryText += ` AND sp.platform = $${paramIndex++}`
    params.push(platform)
  }

  if (start_date) {
    queryText += ` AND sp.scheduled_for >= $${paramIndex++}`
    params.push(start_date)
  }

  if (end_date) {
    queryText += ` AND sp.scheduled_for <= $${paramIndex++}`
    params.push(end_date)
  }

  queryText += ` ORDER BY sp.scheduled_for ASC`

  const result = await query(queryText, params)

  return NextResponse.json({
    posts: result.rows,
    total: result.rows.length
  })
})

// POST - Create new scheduled post
const postHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json()

  const {
    content,
    media_urls,
    hashtags,
    link_url,
    platform,
    account_id,
    scheduled_for,
    timezone,
    ab_test_id,
    variant_letter,
    created_by,
    strategy_id,
    content_type,
  } = body

  // Validation
  if (!content || !platform || !scheduled_for) {
    throw new BadRequestError('Content, platform, and scheduled time are required')
  }

  const result = await query(`
    INSERT INTO scheduled_posts (
      content, media_urls, hashtags, link_url,
      platform, account_id, scheduled_for, timezone,
      status, ab_test_id, variant_letter, created_by,
      strategy_id, content_type,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10, $11, $12, $13, NOW(), NOW()
    ) RETURNING *
  `, [
    content,
    media_urls || [],
    hashtags || [],
    link_url || null,
    platform,
    account_id || null,
    scheduled_for,
    timezone || 'America/Los_Angeles',
    ab_test_id || null,
    variant_letter || null,
    created_by || null,
    strategy_id || null,
    content_type || null,
  ])

  return NextResponse.json({
    success: true,
    post: result.rows[0]
  })
})

// PATCH - Update post (status, reschedule, etc.)
const patchHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    throw new BadRequestError('Post ID is required')
  }

  const allowedFields = [
    'content', 'media_urls', 'hashtags', 'link_url',
    'scheduled_for', 'status'
  ]

  const setClause: string[] = []
  const params: (string | number | string[])[] = [id]
  let paramIndex = 2

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramIndex++}`)
      params.push(value as string | number | string[])
    }
  }

  if (setClause.length === 0) {
    throw new BadRequestError('No valid fields to update')
  }

  setClause.push(`updated_at = NOW()`)

  const result = await query(`
    UPDATE scheduled_posts
    SET ${setClause.join(', ')}
    WHERE id = $1
    RETURNING *
  `, params)

  if (result.rows.length === 0) {
    throw new NotFoundError('Post not found')
  }

  return NextResponse.json({
    success: true,
    post: result.rows[0]
  })
})

export const GET = getHandler
export const POST = postHandler
export const PATCH = patchHandler
