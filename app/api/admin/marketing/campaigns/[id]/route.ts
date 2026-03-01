import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'

// GET - Get campaign with all items
export const GET = withAdminAuth(async (
  request: NextRequest,
  _session,
  context
) => {
  const { id } = await context!.params
  const campaignId = parseInt(id, 10)
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
  }

  const campaignResult = await query(`
    SELECT mc.*,
      u.name AS created_by_name
    FROM marketing_campaigns mc
    LEFT JOIN users u ON mc.created_by = u.id
    WHERE mc.id = $1
  `, [campaignId])

  if (campaignResult.rows.length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const itemsResult = await query(`
    SELECT ci.*,
      sp.status AS scheduled_post_status
    FROM campaign_items ci
    LEFT JOIN scheduled_posts sp ON ci.scheduled_post_id = sp.id
    WHERE ci.campaign_id = $1
    ORDER BY ci.scheduled_for ASC, ci.channel ASC
  `, [campaignId])

  return NextResponse.json({
    campaign: campaignResult.rows[0],
    items: itemsResult.rows,
  })
});

// PUT - Update campaign status
export const PUT = withAdminAuth(async (
  request: NextRequest,
  _session,
  context
) => {
  const { id } = await context!.params
  const campaignId = parseInt(id, 10)
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
  }

  const body = await request.json()
  const { status, name, theme, startDate, endDate, targetAudience } = body

  // Validate status transition if status is being updated
  if (status) {
    const validTransitions: Record<string, string[]> = {
      draft: ['scheduled', 'cancelled'],
      scheduled: ['active', 'cancelled', 'draft'],
      active: ['paused', 'completed', 'cancelled'],
      paused: ['active', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    const current = await query(
      'SELECT status FROM marketing_campaigns WHERE id = $1',
      [campaignId]
    )

    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const currentStatus = current.rows[0].status
    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "${status}"` },
        { status: 400 }
      )
    }
  }

  const setClauses: string[] = ['updated_at = NOW()']
  const queryParams: (string | number | string[])[] = [campaignId]
  let paramIndex = 2

  if (status) {
    setClauses.push(`status = $${paramIndex++}`)
    queryParams.push(status)
  }
  if (name) {
    setClauses.push(`name = $${paramIndex++}`)
    queryParams.push(name)
  }
  if (theme) {
    setClauses.push(`theme = $${paramIndex++}`)
    queryParams.push(theme)
  }
  if (startDate) {
    setClauses.push(`start_date = $${paramIndex++}`)
    queryParams.push(startDate)
  }
  if (endDate) {
    setClauses.push(`end_date = $${paramIndex++}`)
    queryParams.push(endDate)
  }
  if (targetAudience !== undefined) {
    setClauses.push(`target_audience = $${paramIndex++}`)
    queryParams.push(targetAudience)
  }

  const result = await query(`
    UPDATE marketing_campaigns
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING *
  `, queryParams)

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  logger.info('Campaign updated', {
    campaignId,
    updates: Object.keys(body),
  })

  return NextResponse.json({
    success: true,
    campaign: result.rows[0],
  })
});

// DELETE - Cancel campaign
export const DELETE = withAdminAuth(async (
  request: NextRequest,
  _session,
  context
) => {
  const { id } = await context!.params
  const campaignId = parseInt(id, 10)
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
  }

  const result = await query(`
    UPDATE marketing_campaigns
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1 AND status NOT IN ('completed', 'cancelled')
    RETURNING *
  `, [campaignId])

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'Campaign not found or already completed/cancelled' },
      { status: 404 }
    )
  }

  // Cancel all draft/scheduled items
  await query(`
    UPDATE campaign_items
    SET status = 'cancelled', updated_at = NOW()
    WHERE campaign_id = $1 AND status IN ('draft', 'approved', 'scheduled')
  `, [campaignId])

  logger.info('Campaign cancelled', { campaignId })

  return NextResponse.json({
    success: true,
    campaign: result.rows[0],
  })
});
