import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'

// GET - List strategies with optional status filter
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '10')

  let queryText = `
    SELECT
      id, week_start, week_end, theme, summary,
      data_inputs, recommended_posts,
      keyword_opportunities, content_gaps,
      performance_summary, status,
      created_at, updated_at
    FROM marketing_strategies
    WHERE 1=1
  `
  const params: (string | number)[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND status = $${paramIndex++}`
    params.push(status)
  }

  queryText += ` ORDER BY week_start DESC LIMIT $${paramIndex++}`
  params.push(limit)

  const result = await query(queryText, params)

  return NextResponse.json({
    strategies: result.rows,
    total: result.rows.length,
  })
});

// POST - Manually trigger strategy generation
export const POST = withErrorHandling(async (_request: NextRequest) => {
  logger.info('Manual strategy generation triggered via admin API')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const cronResponse = await fetch(`${baseUrl}/api/cron/weekly-strategy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
    },
  })

  const cronData = await cronResponse.json()

  if (!cronResponse.ok) {
    return NextResponse.json(
      { error: cronData.error || 'Strategy generation failed' },
      { status: 500 }
    )
  }

  return NextResponse.json(cronData)
});

// PATCH - Update strategy status (activate, archive, etc.)
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json(
      { error: 'Strategy ID and status are required' },
      { status: 400 }
    )
  }

  const validStatuses = ['draft', 'active', 'completed', 'archived']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const result = await query(`
    UPDATE marketing_strategies
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, status])

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'Strategy not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    strategy: result.rows[0],
  })
});
