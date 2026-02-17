/**
 * Admin API: Trending Topics Management
 *
 * GET  - List trending topics with optional status filter
 * PUT  - Update topic status (action or dismiss)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let queryText = `
      SELECT * FROM trending_topics
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      queryText += ` AND status = $${paramIndex++}`
      params.push(status)
    }

    if (category && category !== 'all') {
      queryText += ` AND category = $${paramIndex++}`
      params.push(category)
    }

    queryText += ` ORDER BY relevance_score DESC, detected_at DESC LIMIT $${paramIndex++}`
    params.push(limit)

    const result = await query(queryText, params)

    return NextResponse.json({
      topics: result.rows,
      total: result.rows.length,
    })
  } catch (error) {
    logger.error('Failed to fetch trending topics', { error })
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    const validStatuses = ['new', 'actioned', 'dismissed', 'expired']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await query(`
      UPDATE trending_topics
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Trending topic not found' }, { status: 404 })
    }

    logger.info('Trending topic status updated', { topicId: id, newStatus: status })

    return NextResponse.json({
      success: true,
      topic: result.rows[0],
    })
  } catch (error) {
    logger.error('Failed to update trending topic', { error })
    return NextResponse.json(
      { error: 'Failed to update trending topic' },
      { status: 500 }
    )
  }
}
